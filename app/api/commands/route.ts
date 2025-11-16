import { NextRequest, NextResponse } from 'next/server';
import { allQuery, runQuery } from '@/lib/db';
import { CheckCommand } from '@/lib/types';

// GET: 모든 점검 명령어 조회
export async function GET() {
  try {
    const commands = await allQuery<CheckCommand>(
      'SELECT * FROM check_commands ORDER BY id ASC'
    );
    return NextResponse.json({ commands });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch commands', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 새 점검 명령어 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, command, description } = body;

    if (!name || !command) {
      return NextResponse.json(
        { error: 'Missing required fields: name, command' },
        { status: 400 }
      );
    }

    await runQuery(
      'INSERT INTO check_commands (name, command, description) VALUES (?, ?, ?)',
      [name, command, description]
    );

    return NextResponse.json({ message: 'Command added successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to add command', details: error.message },
      { status: 500 }
    );
  }
}
