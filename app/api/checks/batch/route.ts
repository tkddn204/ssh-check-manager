import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeSSHCommand } from '@/lib/ssh';
import { CheckStatus } from '@/lib/types';

// POST: 여러 서버에 대해 여러 명령 일괄 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { server_ids, command_ids } = body;

    if (!server_ids || !Array.isArray(server_ids) || server_ids.length === 0) {
      return NextResponse.json(
        { error: 'server_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!command_ids || !Array.isArray(command_ids) || command_ids.length === 0) {
      return NextResponse.json(
        { error: 'command_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    const results = [];

    // 각 서버에 대해
    for (const server_id of server_ids) {
      const server = await prisma.server.findUnique({
        where: { id: parseInt(server_id) },
      });

      if (!server) {
        results.push({
          server_id,
          error: 'Server not found',
          checks: [],
        });
        continue;
      }

      const serverResults = [];

      // 각 명령어 실행
      for (const command_id of command_ids) {
        const command = await prisma.checkCommand.findUnique({
          where: { id: parseInt(command_id) },
        });

        if (!command) {
          serverResults.push({
            command_id,
            error: 'Command not found',
          });
          continue;
        }

        // SSH 명령 실행
        const result = await executeSSHCommand(server, command.command);

        // 결과 저장
        const status: CheckStatus = result.success ? 'success' : (result.error ? 'error' : 'failed');
        
        await prisma.checkResult.create({
          data: {
            serverId: parseInt(server_id),
            commandId: parseInt(command_id),
            output: result.output || null,
            status,
            errorMessage: result.error || null,
            executionTime: result.executionTime,
          },
        });

        serverResults.push({
          command_id,
          command_name: command.name,
          status,
          execution_time: result.executionTime,
        });
      }

      results.push({
        server_id,
        server_name: server.name,
        checks: serverResults,
      });
    }

    return NextResponse.json({
      message: 'Batch check executed successfully',
      results,
    });
  } catch (error: any) {
    console.error('Failed to execute batch check:', error);
    return NextResponse.json(
      { error: 'Failed to execute batch check', details: error.message },
      { status: 500 }
    );
  }
}
