import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const targetDate = new Date(dateParam);
    const startDate = startOfDay(targetDate);
    const endDate = endOfDay(targetDate);

    // 해당 날짜의 모든 체크 결과 조회 (서버 및 명령어 정보 포함)
    const checkResults = await prisma.checkResult.findMany({
      where: {
        checkedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            host: true,
            port: true,
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
      orderBy: [
        { server: { name: 'asc' } },
        { checkedAt: 'desc' },
      ],
    });

    // 서버별로 그룹화
    const serverResultsMap = new Map<number, {
      server_id: number;
      server_name: string;
      host: string;
      port: number;
      results: Array<{
        id: number;
        command_name: string;
        command: string;
        status: string;
        output: string | null;
        error_message: string | null;
        checked_at: string;
      }>;
      success_count: number;
      failed_count: number;
    }>();

    checkResults.forEach((result) => {
      const serverId = result.server.id;

      if (!serverResultsMap.has(serverId)) {
        serverResultsMap.set(serverId, {
          server_id: serverId,
          server_name: result.server.name,
          host: result.server.host,
          port: result.server.port,
          results: [],
          success_count: 0,
          failed_count: 0,
        });
      }

      const serverData = serverResultsMap.get(serverId)!;

      serverData.results.push({
        id: result.id,
        command_name: result.command.name,
        command: result.command.command,
        status: result.status,
        output: result.output,
        error_message: result.errorMessage,
        checked_at: result.checkedAt.toISOString(),
      });

      if (result.status === 'success') {
        serverData.success_count++;
      } else {
        serverData.failed_count++;
      }
    });

    const serverResults = Array.from(serverResultsMap.values());

    return NextResponse.json({
      date: dateParam,
      server_results: serverResults,
      total_servers: serverResults.length,
    });
  } catch (error) {
    console.error('Failed to fetch daily results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily results' },
      { status: 500 }
    );
  }
}