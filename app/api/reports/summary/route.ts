import { NextRequest, NextResponse } from 'next/server';
import { getQuery } from '@/lib/db';

// GET: 전체 통계 요약
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');

    let whereClause = '';
    const params: any[] = [];

    if (server_id) {
      whereClause = 'WHERE server_id = ?';
      params.push(server_id);
    }

    const summary = await getQuery<any>(
      `SELECT
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
        AVG(execution_time) as avg_execution_time,
        MIN(checked_at) as first_check,
        MAX(checked_at) as last_check
      FROM check_results
      ${whereClause}`,
      params
    );

    return NextResponse.json({ summary });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch summary', details: error.message },
      { status: 500 }
    );
  }
}
