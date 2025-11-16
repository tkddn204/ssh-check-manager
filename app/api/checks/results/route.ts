import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CheckStatus } from '@/lib/types';

// GET: 점검 결과 조회 (필터링 및 페이징 지원)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');
    const command_id = searchParams.get('command_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (server_id) {
      where.serverId = parseInt(server_id);
    }

    if (command_id) {
      where.commandId = parseInt(command_id);
    }

    if (status) {
      where.status = status as CheckStatus;
    }

    const results = await prisma.checkResult.findMany({
      where,
      include: {
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
        command: {
          select: {
            id: true,
            name: true,
            command: true,
          },
        },
      },
      orderBy: {
        checkedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.checkResult.count({ where });

    // 프론트엔드 형식으로 변환 (snake_case)
    const formattedResults = results.map((result) => ({
      id: result.id,
      server_name: result.server.name,
      command_name: result.command.name,
      status: result.status,
      output: result.output,
      error_message: result.errorMessage,
      execution_time: result.executionTime,
      checked_at: result.checkedAt,
    }));

    return NextResponse.json({ results: formattedResults, count: formattedResults.length, total });
  } catch (error: any) {
    console.error('Failed to fetch check results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check results', details: error.message },
      { status: 500 }
    );
  }
}
