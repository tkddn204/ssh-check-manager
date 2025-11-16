import { NextRequest, NextResponse } from 'next/server';
import { getQuery, runQuery } from '@/lib/db';
import { Server } from '@/lib/types';

// GET: 특정 서버 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const server = await getQuery<Server>('SELECT * FROM servers WHERE id = ?', [params.id]);

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // 비밀번호와 개인키는 응답에서 제외 (보안)
    const { password, private_key, ...sanitizedServer } = server;

    return NextResponse.json({ server: sanitizedServer });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch server', details: error.message },
      { status: 500 }
    );
  }
}

// PUT: 서버 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, host, port, username, auth_type, password, private_key, description } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (host) {
      updates.push('host = ?');
      values.push(host);
    }
    if (port) {
      updates.push('port = ?');
      values.push(port);
    }
    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (auth_type) {
      updates.push('auth_type = ?');
      values.push(auth_type);
    }
    if (password !== undefined) {
      updates.push('password = ?');
      values.push(password);
    }
    if (private_key !== undefined) {
      updates.push('private_key = ?');
      values.push(private_key);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(params.id);

    await runQuery(
      `UPDATE servers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ message: 'Server updated successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update server', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 서버 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await runQuery('DELETE FROM servers WHERE id = ?', [params.id]);
    return NextResponse.json({ message: 'Server deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete server', details: error.message },
      { status: 500 }
    );
  }
}
