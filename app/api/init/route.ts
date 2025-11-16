import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

// POST: 데이터베이스 초기화
export async function POST() {
  try {
    await initDatabase();
    return NextResponse.json({
      message: 'Database initialized successfully',
    });
  } catch (error: any) {
    console.error('Failed to initialize database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: error.message },
      { status: 500 }
    );
  }
}
