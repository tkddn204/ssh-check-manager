import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthType } from '@/lib/types';
import { encrypt } from '@/lib/crypto';

// GET: 모든 인증 정보 조회
export async function GET() {
  try {
    const credentials = await prisma.credential.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { servers: true },
        },
      },
    });

    const formattedCredentials = credentials.map((cred) => ({
      id: cred.id,
      name: cred.name,
      username: cred.username,
      auth_type: cred.authType,
      has_password: !!cred.password,
      has_private_key: !!cred.privateKey,
      description: cred.description,
      server_count: cred._count.servers,
      created_at: cred.createdAt,
      updated_at: cred.updatedAt,
    }));

    return NextResponse.json({ credentials: formattedCredentials });
  } catch (error: any) {
    console.error('Failed to fetch credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 새로운 인증 정보 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, auth_type, password, private_key, description } = body;

    if (!name || !username || !auth_type) {
      return NextResponse.json(
        { error: 'name, username, and auth_type are required' },
        { status: 400 }
      );
    }

    // 인증 타입에 따른 유효성 검사
    if (auth_type === 'password' && !password) {
      return NextResponse.json(
        { error: 'password is required for password authentication' },
        { status: 400 }
      );
    }

    if (auth_type === 'key' && !private_key) {
      return NextResponse.json(
        { error: 'private_key is required for key authentication' },
        { status: 400 }
      );
    }

    const credential = await prisma.credential.create({
      data: {
        name,
        username,
        authType: auth_type as AuthType,
        password: password ? encrypt(password) : null,
        privateKey: private_key || null,
        description: description || null,
      },
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
    console.error('Failed to create credential:', error);
    return NextResponse.json(
      { error: 'Failed to create credential', details: error.message },
      { status: 500 }
    );
  }
}
