import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: 특정 VPN 프로필 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid VPN profile ID' },
        { status: 400 }
      );
    }

    const vpnProfile = await prisma.vpnProfile.findUnique({
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

    if (!vpnProfile) {
      return NextResponse.json(
        { error: 'VPN profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: vpnProfile.id,
      name: vpnProfile.name,
      process_name: vpnProfile.processName,
      description: vpnProfile.description,
      servers: vpnProfile.servers,
      created_at: vpnProfile.createdAt,
      updated_at: vpnProfile.updatedAt,
    });
  } catch (error) {
    console.error('Failed to fetch VPN profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VPN profile' },
      { status: 500 }
    );
  }
}

// PUT: VPN 프로필 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid VPN profile ID' },
        { status: 400 }
      );
    }

    const { name, process_name, description } = await request.json();

    if (!name || !process_name) {
      return NextResponse.json(
        { error: 'Name and process_name are required' },
        { status: 400 }
      );
    }

    const vpnProfile = await prisma.vpnProfile.update({
      where: { id },
      data: {
        name,
        processName: process_name,
        description,
      },
    });

    return NextResponse.json({
      id: vpnProfile.id,
      name: vpnProfile.name,
      process_name: vpnProfile.processName,
      description: vpnProfile.description,
      created_at: vpnProfile.createdAt,
      updated_at: vpnProfile.updatedAt,
    });
  } catch (error) {
    console.error('Failed to update VPN profile:', error);
    return NextResponse.json(
      { error: 'Failed to update VPN profile' },
      { status: 500 }
    );
  }
}

// DELETE: VPN 프로필 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid VPN profile ID' },
        { status: 400 }
      );
    }

    await prisma.vpnProfile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete VPN profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete VPN profile' },
      { status: 500 }
    );
  }
}