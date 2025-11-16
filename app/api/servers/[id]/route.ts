import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthType, ClientType } from '@/lib/types';

// GET: 특정 서버 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const server = await prisma.server.findUnique({
      where: { id: parseInt(params.id) },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        authType: true,
        description: true,
        requiresClient: true,
        clientType: true,
        clientConfig: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json({ server });
  } catch (error: any) {
    console.error('Failed to fetch server:', error);
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
    const {
      name,
      host,
      port,
      username,
      authType,
      password,
      privateKey,
      description,
      requiresClient,
      clientType,
      clientConfig
    } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (host !== undefined) updateData.host = host;
    if (port !== undefined) updateData.port = port;
    if (username !== undefined) updateData.username = username;
    if (authType !== undefined) updateData.authType = authType as AuthType;
    if (password !== undefined) updateData.password = password;
    if (privateKey !== undefined) updateData.privateKey = privateKey;
    if (description !== undefined) updateData.description = description;
    if (requiresClient !== undefined) updateData.requiresClient = requiresClient;
    if (clientType !== undefined) updateData.clientType = clientType as ClientType | null;
    if (clientConfig !== undefined) updateData.clientConfig = clientConfig;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const server = await prisma.server.update({
      where: { id: parseInt(params.id) },
      data: updateData,
    });

    return NextResponse.json({ 
      message: 'Server updated successfully',
      server: {
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
      }
    });
  } catch (error: any) {
    console.error('Failed to update server:', error);
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
    await prisma.server.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ message: 'Server deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete server:', error);
    return NextResponse.json(
      { error: 'Failed to delete server', details: error.message },
      { status: 500 }
    );
  }
}
