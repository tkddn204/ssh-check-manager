import { NextRequest, NextResponse } from 'next/server';
import { allQuery } from '@/lib/db';
import { DailyReport } from '@/lib/types';

// GET: 일별 리포트 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30'); // 기본 30일
    const server_id = searchParams.get('server_id');

    let query = `
      SELECT
        DATE(checked_at) as date,
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
        AVG(execution_time) as avg_execution_time
      FROM check_results
      WHERE checked_at >= datetime('now', '-' || ? || ' days')
    `;
    const params: any[] = [days];

    if (server_id) {
      query += ' AND server_id = ?';
      params.push(server_id);
    }

    query += ' GROUP BY DATE(checked_at) ORDER BY date DESC';

    const reports = await allQuery<DailyReport>(query, params);

    return NextResponse.json({ reports });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch daily reports', details: error.message },
      { status: 500 }
    );
  }
}
