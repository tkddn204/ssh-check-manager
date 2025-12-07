import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CheckStatus } from '@/lib/types';

// GET: 특정 점검 결과 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    const result = await prisma.checkResult.findUnique({
      where: { id },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
        command: {
          select: {
            id: true,
            name: true,
            command: true,
          },
        },
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'Check result not found' }, { status: 404 });
    }

    return NextResponse.json({
      result: {
        id: result.id,
        server_id: result.serverId,
        server_name: result.server.name,
        command_id: result.commandId,
        command_name: result.command.name,
        status: result.status,
        output: result.output,
        error_message: result.errorMessage,
        execution_time: result.executionTime,
        checked_at: result.checkedAt,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch check result:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check result', details: error.message },
      { status: 500 }
    );
  }
}

// PUT: 점검 결과 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { output, status, error_message, execution_time } = body;

    // 기존 결과 확인
    const existing = await prisma.checkResult.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Check result not found' }, { status: 404 });
    }

    // 업데이트할 데이터 준비
    const updateData: any = {};

    if (output !== undefined) updateData.output = output;
    if (status !== undefined) updateData.status = status as CheckStatus;
    if (error_message !== undefined) updateData.errorMessage = error_message;
    if (execution_time !== undefined) updateData.executionTime = execution_time;

    const result = await prisma.checkResult.update({
      where: { id },
      data: updateData,
      include: {
        server: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
        command: {
          select: {
            id: true,
            name: true,
            command: true,
          },
        },
      },
    });

    return NextResponse.json({
      result: {
        id: result.id,
        server_id: result.serverId,
        server_name: result.server.name,
        command_id: result.commandId,
        command_name: result.command.name,
        status: result.status,
        output: result.output,
        error_message: result.errorMessage,
        execution_time: result.executionTime,
        checked_at: result.checkedAt,
      },
    });
  } catch (error: any) {
    console.error('Failed to update check result:', error);
    return NextResponse.json(
      { error: 'Failed to update check result', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 점검 결과 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    // 기존 결과 확인
    const existing = await prisma.checkResult.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Check result not found' }, { status: 404 });
    }

    await prisma.checkResult.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Check result deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete check result:', error);
    return NextResponse.json(
      { error: 'Failed to delete check result', details: error.message },
      { status: 500 }
    );
  }
}
