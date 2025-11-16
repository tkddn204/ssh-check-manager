import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { subDays } from 'date-fns';

// GET: 일별 리포트 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const server_id = searchParams.get('server_id');

    const startDate = subDays(new Date(), days);

    // Prisma raw query 사용
    let sql = `
      SELECT
        DATE(checked_at) as date,
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
        AVG(execution_time) as avg_execution_time
      FROM check_results
      WHERE checked_at >= ?
    `;

    const params: any[] = [startDate];

    if (server_id) {
      sql += ' AND server_id = ?';
      params.push(parseInt(server_id));
    }

    sql += ' GROUP BY DATE(checked_at) ORDER BY date DESC';

    const reports = await prisma.$queryRawUnsafe(sql, ...params) as any[];

    // BigInt를 Number로 변환
    const serializedReports = reports.map((report) => ({
      date: report.date,
      total_checks: Number(report.total_checks),
      success_count: Number(report.success_count),
      failed_count: Number(report.failed_count),
      error_count: Number(report.error_count),
      avg_execution_time: report.avg_execution_time,
    }));

    return NextResponse.json({ reports: serializedReports });
  } catch (error: any) {
    console.error('Failed to fetch daily reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily reports', details: error.message },
      { status: 500 }
    );
  }
}
