import { NextRequest, NextResponse } from 'next/server';
import { allQuery } from '@/lib/db';
import { CheckResultWithDetails } from '@/lib/types';

// GET: 점검 결과 조회 (필터링 및 페이징 지원)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');
    const command_id = searchParams.get('command_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT
        cr.*,
        s.name as server_name,
        cc.name as command_name,
        cc.command as command
      FROM check_results cr
      JOIN servers s ON cr.server_id = s.id
      JOIN check_commands cc ON cr.command_id = cc.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (server_id) {
      query += ' AND cr.server_id = ?';
      params.push(server_id);
    }

    if (command_id) {
      query += ' AND cr.command_id = ?';
      params.push(command_id);
    }

    if (status) {
      query += ' AND cr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cr.checked_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const results = await allQuery<CheckResultWithDetails>(query, params);

    return NextResponse.json({ results, count: results.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch check results', details: error.message },
      { status: 500 }
    );
  }
}
