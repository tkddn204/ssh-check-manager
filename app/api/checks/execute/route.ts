import { NextRequest, NextResponse } from 'next/server';
import { getQuery, runQuery } from '@/lib/db';
import { Server, CheckCommand } from '@/lib/types';
import { executeSSHCommand } from '@/lib/ssh';

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
    const server = await getQuery<Server>('SELECT * FROM servers WHERE id = ?', [server_id]);
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // 명령어 정보 조회
    const command = await getQuery<CheckCommand>('SELECT * FROM check_commands WHERE id = ?', [command_id]);
    if (!command) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
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

    return NextResponse.json({
      message: 'Check executed successfully',
      result: {
        status,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to execute check', details: error.message },
      { status: 500 }
    );
  }
}
