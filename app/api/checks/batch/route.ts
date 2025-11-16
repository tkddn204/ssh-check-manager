import { NextRequest, NextResponse } from 'next/server';
import { getQuery, runQuery, allQuery } from '@/lib/db';
import { Server, CheckCommand } from '@/lib/types';
import { executeSSHCommand } from '@/lib/ssh';

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
      const server = await getQuery<Server>('SELECT * FROM servers WHERE id = ?', [server_id]);
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
        const command = await getQuery<CheckCommand>('SELECT * FROM check_commands WHERE id = ?', [command_id]);
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
        const status = result.success ? 'success' : (result.error ? 'error' : 'failed');
        await runQuery(
          `INSERT INTO check_results (server_id, command_id, output, status, error_message, execution_time)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            server_id,
            command_id,
            result.output || null,
            status,
            result.error || null,
            result.executionTime,
          ]
        );

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
    return NextResponse.json(
      { error: 'Failed to execute batch check', details: error.message },
      { status: 500 }
    );
  }
}
