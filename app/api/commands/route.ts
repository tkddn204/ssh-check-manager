import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: 모든 점검 명령어 조회
export async function GET() {
  try {
    const commands = await prisma.checkCommand.findMany({
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({ commands });
  } catch (error: any) {
    console.error('Failed to fetch commands:', error);
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

    const newCommand = await prisma.checkCommand.create({
      data: {
        name,
        command,
        description,
      },
    });

    return NextResponse.json({
      message: 'Command added successfully',
      command: newCommand
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add command:', error);
    return NextResponse.json(
      { error: 'Failed to add command', details: error.message },
      { status: 500 }
    );
  }
}
