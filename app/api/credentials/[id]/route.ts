import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthType } from '@/lib/types';
import { encrypt, decrypt } from '@/lib/crypto';

// GET: 특정 인증 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    const credential = await prisma.credential.findUnique({
      where: { id },
      include: {
        servers: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    return NextResponse.json({
      credential: {
        id: credential.id,
        name: credential.name,
        username: credential.username,
        auth_type: credential.authType,
        password: credential.password ? decrypt(credential.password) : null,
        private_key: credential.privateKey,
        description: credential.description,
        servers: credential.servers,
        created_at: credential.createdAt,
        updated_at: credential.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch credential:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credential', details: error.message },
      { status: 500 }
    );
  }
}

// PUT: 인증 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, username, auth_type, password, private_key, description } = body;

    // 기존 인증 정보 확인
    const existing = await prisma.credential.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // 업데이트 데이터 준비
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (auth_type !== undefined) updateData.authType = auth_type as AuthType;
    if (password !== undefined) updateData.password = password ? encrypt(password) : null;
    if (private_key !== undefined) updateData.privateKey = private_key || null;
    if (description !== undefined) updateData.description = description !== null ? description : null;

    const credential = await prisma.credential.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      credential: {
        id: credential.id,
        name: credential.name,
        username: credential.username,
        auth_type: credential.authType,
        has_password: !!credential.password,
        has_private_key: !!credential.privateKey,
        description: credential.description,
        created_at: credential.createdAt,
        updated_at: credential.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Failed to update credential:', error);
    return NextResponse.json(
      { error: 'Failed to update credential', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 인증 정보 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    // 기존 인증 정보 확인
    const existing = await prisma.credential.findUnique({
      where: { id },
      include: {
        _count: {
          select: { servers: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // 사용 중인 서버가 있는지 확인
    if (existing._count.servers > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete credential',
          details: `This credential is used by ${existing._count.servers} server(s)`,
        },
        { status: 400 }
      );
    }

    await prisma.credential.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Credential deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete credential:', error);
    return NextResponse.json(
      { error: 'Failed to delete credential', details: error.message },
      { status: 500 }
    );
  }
}
