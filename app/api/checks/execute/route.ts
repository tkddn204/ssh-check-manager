import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeSSHCommand } from '@/lib/ssh';
import { CheckStatus } from '@/lib/types';

// POST: 점검 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { server_id, command_id } = body;

    if (!server_id || !command_id) {
      return NextResponse.json(
        { error: 'Missing required fields: server_id, command_id' },
        { status: 400 }
      );
    }

    // 서버 정보 조회
    const server = await prisma.server.findUnique({
      where: { id: parseInt(server_id) },
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // 명령어 정보 조회
    const command = await prisma.checkCommand.findUnique({
      where: { id: parseInt(command_id) },
    });

    if (!command) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    // SSH 명령 실행
    const result = await executeSSHCommand(server, command.command);

    // 결과 저장
    const status: CheckStatus = result.success ? 'success' : (result.error ? 'error' : 'failed');
    
    const checkResult = await prisma.checkResult.create({
      data: {
        serverId: parseInt(server_id),
        commandId: parseInt(command_id),
        output: result.output || null,
        status,
        errorMessage: result.error || null,
        executionTime: result.executionTime,
      },
    });

    return NextResponse.json({
      message: 'Check executed successfully',
      result: {
        id: checkResult.id,
        status,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
      },
    });
  } catch (error: any) {
    console.error('Failed to execute check:', error);
    return NextResponse.json(
      { error: 'Failed to execute check', details: error.message },
      { status: 500 }
    );
  }
}
