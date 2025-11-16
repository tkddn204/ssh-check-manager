import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // 해당 월의 시작과 끝 날짜
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // 모든 서버 조회
    const servers = await prisma.server.findMany({
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // 해당 월의 모든 체크 결과 조회
    const checkResults = await prisma.checkResult.findMany({
      where: {
        checkedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        serverId: true,
        status: true,
        checkedAt: true,
      },
      orderBy: {
        checkedAt: 'asc',
      },
    });

    // 날짜 배열 생성 (1일 ~ 말일)
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

    // 서버별 월간 접속 상태 데이터 구성
    const monthlyStatus = servers.map((server) => {
      const dailyStatus: {
        [day: string]: {
          hasConnection: boolean;
          successCount: number;
          failedCount: number;
          lastCheckedAt?: Date;
        };
      } = {};

      // 각 날짜에 대해 초기화
      daysInMonth.forEach((day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        dailyStatus[dayKey] = {
          hasConnection: false,
          successCount: 0,
          failedCount: 0,
        };
      });

      // 해당 서버의 체크 결과를 날짜별로 집계
      const serverResults = checkResults.filter((r) => r.serverId === server.id);

      serverResults.forEach((result) => {
        const dayKey = format(result.checkedAt, 'yyyy-MM-dd');

        if (dailyStatus[dayKey]) {
          dailyStatus[dayKey].hasConnection = true;
          dailyStatus[dayKey].lastCheckedAt = result.checkedAt;

          if (result.status === 'success') {
            dailyStatus[dayKey].successCount++;
          } else {
            dailyStatus[dayKey].failedCount++;
          }
        }
      });

      return {
        serverId: server.id,
        serverName: server.name,
        host: server.host,
        port: server.port,
        dailyStatus,
      };
    });

    return NextResponse.json({
      year,
      month,
      monthlyStatus,
    });
  } catch (error) {
    console.error('Failed to fetch monthly status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly status' },
      { status: 500 }
    );
  }
}
