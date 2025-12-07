import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthType } from '@/lib/types';
import { encrypt } from '@/lib/crypto';

// GET: 모든 서버 목록 조회
export async function GET() {
  try {
    const servers = await prisma.server.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        credential: {
          select: {
            id: true,
            name: true,
            username: true,
            authType: true,
          },
        },
        vpnProfile: {
          select: {
            id: true,
            name: true,
            processName: true,
          },
        },
      },
    });

    // Flatten credential fields for backward compatibility
    const formattedServers = servers.map(server => ({
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      description: server.description,
      executionLocation: server.executionLocation,
      requiresClient: server.requiresClient,
      clientType: server.clientType,
      clientConfig: server.clientConfig,
      vpnProfileId: server.vpnProfileId,
      vpnProfile: server.vpnProfile,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      // Credential fields
      credentialId: server.credentialId,
      credential: server.credential,
      username: server.credential?.username,
      authType: server.credential?.authType,
    }));

    return NextResponse.json({ servers: formattedServers });
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
      credentialId,
      // Legacy fields for creating credential on the fly
      username,
      authType,
      password,
      privateKey,
      credentialName,
      description,
      vpnProfileId,
      requiresClient,
      clientType,
      clientConfig
    } = body;

    // 유효성 검사
    if (!name || !host) {
      return NextResponse.json(
        { error: 'Missing required fields: name, host' },
        { status: 400 }
      );
    }

    let finalCredentialId = credentialId;

    // credentialId가 없으면 credential 정보로 새로 생성
    if (!finalCredentialId && username && authType) {
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

      // Credential 생성
      const credential = await prisma.credential.create({
        data: {
          name: credentialName || `${name} - ${username}`,
          username,
          authType: authType as AuthType,
          password: authType === 'password' && password ? encrypt(password) : null,
          privateKey: authType === 'key' ? privateKey : null,
        },
      });

      finalCredentialId = credential.id;
    }

    if (!finalCredentialId) {
      return NextResponse.json(
        { error: 'Either credentialId or credential information (username, authType) is required' },
        { status: 400 }
      );
    }

    const server = await prisma.server.create({
      data: {
        name,
        host,
        port: port || 22,
        credentialId: finalCredentialId,
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
