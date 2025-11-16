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

    return NextResponse.json({ results, count: results.length, total });
  } catch (error: any) {
    console.error('Failed to fetch check results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check results', details: error.message },
      { status: 500 }
    );
  }
}
