import { PrismaClient } from '@prisma/client';

// PrismaClient 싱글톤 패턴
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 데이터베이스 초기화 함수
export async function initDatabase() {
  try {
    // 기본 점검 명령어 추가 (없으면 추가)
    const existingCommands = await prisma.checkCommand.count();

    if (existingCommands === 0) {
      await prisma.checkCommand.createMany({
        data: [
          {
            name: 'Disk Usage',
            command: 'df -h',
            description: '디스크 사용량 확인',
          },
          {
            name: 'Memory Usage',
            command: 'free -h',
            description: '메모리 사용량 확인',
          },
          {
            name: 'CPU Load',
            command: 'uptime',
            description: 'CPU 로드 및 업타임 확인',
          },
          {
            name: 'Running Processes',
            command: 'ps aux --sort=-%cpu | head -20',
            description: '상위 CPU 사용 프로세스 확인',
          },
          {
            name: 'Network Status',
            command: 'netstat -tuln | head -20',
            description: '네트워크 리스닝 포트 확인',
          },
          {
            name: 'System Info',
            command: 'uname -a',
            description: '시스템 정보 확인',
          },
          {
            name: 'Disk I/O',
            command: 'iostat 1 5 2>/dev/null || echo "iostat not available"',
            description: '디스크 I/O 통계',
          },
        ],
      });

      console.log('기본 점검 명령어가 추가되었습니다.');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// 애플리케이션 종료 시 연결 해제
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export default prisma;
