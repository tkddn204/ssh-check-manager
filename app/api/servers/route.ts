import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthType } from '@/lib/types';

// GET: 모든 서버 목록 조회
export async function GET() {
  try {
    const servers = await prisma.server.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        authType: true,
        description: true,
        executionLocation: true,
        requiresClient: true,
        clientType: true,
        clientConfig: true,
        vpnProfileId: true,
        vpnProfile: {
          select: {
            id: true,
            name: true,
            processName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ servers });
  } catch (error: any) {
    console.error('Failed to fetch servers:', error);
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
    const {
      name,
      host,
      port,
      username,
      authType,
      password,
      privateKey,
      description,
      vpnProfileId,
      requiresClient,
      clientType,
      clientConfig
    } = body;

    // 유효성 검사
    if (!name || !host || !username || !authType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, host, username, authType' },
        { status: 400 }
      );
    }

    if (authType === 'password' && !password) {
      return NextResponse.json(
        { error: 'Password is required for password authentication' },
        { status: 400 }
      );
    }

    if (authType === 'key' && !privateKey) {
      return NextResponse.json(
        { error: 'Private key is required for key authentication' },
        { status: 400 }
      );
    }

    const server = await prisma.server.create({
      data: {
        name,
        host,
        port: port || 22,
        username,
        authType: authType as AuthType,
        password: authType === 'password' ? password : null,
        privateKey: authType === 'key' ? privateKey : null,
        description,
        vpnProfileId: vpnProfileId || null,
        executionLocation: 'client', // All servers use client-side SSH connections
        requiresClient: requiresClient || false,
        clientType: clientType || null,
        clientConfig: clientConfig || null,
      },
    });

    return NextResponse.json({
      message: 'Server added successfully',
      server: {
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add server:', error);
    return NextResponse.json(
      { error: 'Failed to add server', details: error.message },
      { status: 500 }
    );
  }
}
