import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: 특정 명령어 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const command = await prisma.checkCommand.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!command) {
      return NextResponse.json(
        { error: 'Command not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ command });
  } catch (error: any) {
    console.error('Failed to fetch command:', error);
    return NextResponse.json(
      { error: 'Failed to fetch command', details: error.message },
      { status: 500 }
    );
  }
}

// PUT: 명령어 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, command, description } = body;

    if (!name || !command) {
      return NextResponse.json(
        { error: 'Missing required fields: name, command' },
        { status: 400 }
      );
    }

    const updatedCommand = await prisma.checkCommand.update({
      where: { id: parseInt(params.id) },
      data: {
        name,
        command,
        description: description || null,
      },
    });

    return NextResponse.json({
      message: 'Command updated successfully',
      command: updatedCommand,
    });
  } catch (error: any) {
    console.error('Failed to update command:', error);
    return NextResponse.json(
      { error: 'Failed to update command', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 명령어 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.checkCommand.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({
      message: 'Command deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete command:', error);
    return NextResponse.json(
      { error: 'Failed to delete command', details: error.message },
      { status: 500 }
    );
  }
}
