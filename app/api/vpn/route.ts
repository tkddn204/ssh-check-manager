import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: 모든 VPN 프로필 조회
export async function GET() {
  try {
    const vpnProfiles = await prisma.vpnProfile.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            servers: true,
          },
        },
      },
    });

    return NextResponse.json({
      vpn_profiles: vpnProfiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        process_name: profile.processName,
        description: profile.description,
        server_count: profile._count.servers,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch VPN profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VPN profiles' },
      { status: 500 }
    );
  }
}

// POST: 새 VPN 프로필 생성
export async function POST(request: NextRequest) {
  try {
    const { name, process_name, description } = await request.json();

    if (!name || !process_name) {
      return NextResponse.json(
        { error: 'Name and process_name are required' },
        { status: 400 }
      );
    }

    const vpnProfile = await prisma.vpnProfile.create({
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
    console.error('Failed to create VPN profile:', error);
    return NextResponse.json(
      { error: 'Failed to create VPN profile' },
      { status: 500 }
    );
  }
}