import { NextRequest, NextResponse } from 'next/server';
import { allQuery, runQuery } from '@/lib/db';
import { Server } from '@/lib/types';

// GET: 모든 서버 목록 조회
export async function GET() {
  try {
    const servers = await allQuery<Server>('SELECT * FROM servers ORDER BY created_at DESC');

    // 비밀번호와 개인키는 응답에서 제외
    const sanitizedServers = servers.map(({ password, private_key, ...server }) => server);

    return NextResponse.json({ servers: sanitizedServers });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch servers', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 새 서버 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, host, port, username, auth_type, password, private_key, description } = body;

    // 유효성 검사
    if (!name || !host || !username || !auth_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, host, username, auth_type' },
        { status: 400 }
      );
    }

    if (auth_type === 'password' && !password) {
      return NextResponse.json(
        { error: 'Password is required for password authentication' },
        { status: 400 }
      );
    }

    if (auth_type === 'key' && !private_key) {
      return NextResponse.json(
        { error: 'Private key is required for key authentication' },
        { status: 400 }
      );
    }

    await runQuery(
      `INSERT INTO servers (name, host, port, username, auth_type, password, private_key, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, host, port || 22, username, auth_type, password, private_key, description]
    );

    return NextResponse.json({ message: 'Server added successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to add server', details: error.message },
      { status: 500 }
    );
  }
}
