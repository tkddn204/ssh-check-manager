import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: 서버별 최신 점검 결과 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const server_id = searchParams.get('server_id');

    // 모든 서버 조회
    const servers = await prisma.server.findMany({
      where: server_id ? { id: parseInt(server_id) } : {},
      orderBy: { name: 'asc' },
    });

    // 각 서버별로 최신 점검 결과 조회
    const serverStatusList = await Promise.all(
      servers.map(async (server) => {
        // 이 서버의 모든 점검 명령어별 최신 결과 조회
        const commands = await prisma.checkCommand.findMany({
          orderBy: { name: 'asc' },
        });

        const commandResults = await Promise.all(
          commands.map(async (command) => {
            const latestResult = await prisma.checkResult.findFirst({
              where: {
                serverId: server.id,
                commandId: command.id,
              },
              orderBy: { checkedAt: 'desc' },
            });

            return {
              command_id: command.id,
              command_name: command.name,
              command_description: command.description,
              result: latestResult
                ? {
                    id: latestResult.id,
                    status: latestResult.status,
                    output: latestResult.output,
                    error_message: latestResult.errorMessage,
                    execution_time: latestResult.executionTime,
                    checked_at: latestResult.checkedAt,
                  }
                : null,
            };
          })
        );

        // 이 서버의 전체 통계
        const totalChecks = await prisma.checkResult.count({
          where: { serverId: server.id },
        });
        const successCount = await prisma.checkResult.count({
          where: { serverId: server.id, status: 'success' },
        });
        const failedCount = await prisma.checkResult.count({
          where: { serverId: server.id, status: 'failed' },
        });
        const errorCount = await prisma.checkResult.count({
          where: { serverId: server.id, status: 'error' },
        });

        return {
          server_id: server.id,
          server_name: server.name,
          server_host: server.host,
          server_description: server.description,
          statistics: {
            total_checks: totalChecks,
            success_count: successCount,
            failed_count: failedCount,
            error_count: errorCount,
          },
          command_results: commandResults,
        };
      })
    );

    return NextResponse.json({ servers: serverStatusList });
  } catch (error: any) {
    console.error('Failed to fetch server status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server status', details: error.message },
      { status: 500 }
    );
  }
}
