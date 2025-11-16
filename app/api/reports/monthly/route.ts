import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { subMonths } from 'date-fns';

// GET: 월별 리포트 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '12');
    const server_id = searchParams.get('server_id');

    const startDate = subMonths(new Date(), months);

    // Prisma raw query 사용 (MySQL용)
    let sql = `
      SELECT
        DATE_FORMAT(checked_at, '%Y-%m') as month,
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

    sql += ' GROUP BY DATE_FORMAT(checked_at, "%Y-%m") ORDER BY month DESC';

    const reports = await prisma.$queryRawUnsafe(sql, ...params) as any[];

    // BigInt를 Number로 변환
    const serializedReports = reports.map((report) => ({
      month: report.month,
      total_checks: Number(report.total_checks),
      success_count: Number(report.success_count),
      failed_count: Number(report.failed_count),
      error_count: Number(report.error_count),
      avg_execution_time: report.avg_execution_time,
    }));

    return NextResponse.json({ reports: serializedReports });
  } catch (error: any) {
    console.error('Failed to fetch monthly reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly reports', details: error.message },
      { status: 500 }
    );
  }
}
