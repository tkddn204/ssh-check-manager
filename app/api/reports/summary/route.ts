import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: 전체 통계 요약
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');

    const where: any = {};
    if (server_id) {
      where.serverId = parseInt(server_id);
    }

    const [totalChecks, successCount, failedCount, errorCount, avgExecutionResult, firstCheck, lastCheck] = await Promise.all([
      prisma.checkResult.count({ where }),
      prisma.checkResult.count({ where: { ...where, status: 'success' } }),
      prisma.checkResult.count({ where: { ...where, status: 'failed' } }),
      prisma.checkResult.count({ where: { ...where, status: 'error' } }),
      prisma.checkResult.aggregate({
        where,
        _avg: { executionTime: true },
      }),
      prisma.checkResult.findFirst({
        where,
        orderBy: { checkedAt: 'asc' },
        select: { checkedAt: true },
      }),
      prisma.checkResult.findFirst({
        where,
        orderBy: { checkedAt: 'desc' },
        select: { checkedAt: true },
      }),
    ]);

    const summary = {
      total_checks: totalChecks,
      success_count: successCount,
      failed_count: failedCount,
      error_count: errorCount,
      avg_execution_time: avgExecutionResult._avg.executionTime || 0,
      first_check: firstCheck?.checkedAt || null,
      last_check: lastCheck?.checkedAt || null,
    };

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Failed to fetch summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary', details: error.message },
      { status: 500 }
    );
  }
}
