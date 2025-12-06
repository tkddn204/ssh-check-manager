import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { executeSSHCommandStreaming } from '@/lib/ssh';
import { CheckStatus } from '@/lib/types';

// POST: 여러 서버에 대해 여러 명령 일괄 실행 (SSE 스트리밍)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { server_ids, command_ids } = body;

  if (!server_ids || !Array.isArray(server_ids) || server_ids.length === 0) {
    return new Response(
      JSON.stringify({ error: 'server_ids must be a non-empty array' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!command_ids || !Array.isArray(command_ids) || command_ids.length === 0) {
    return new Response(
      JSON.stringify({ error: 'command_ids must be a non-empty array' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // SSE 스트림 생성
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // SSE 메시지 전송 헬퍼 함수
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        sendEvent('start', {
          message: 'Batch execution started',
          total_servers: server_ids.length,
          total_commands: command_ids.length,
        });

        // 각 서버에 대해
        for (let serverIndex = 0; serverIndex < server_ids.length; serverIndex++) {
          const server_id = server_ids[serverIndex];

          const server = await prisma.server.findUnique({
            where: { id: parseInt(server_id) },
          });

          if (!server) {
            sendEvent('error', {
              server_id,
              message: 'Server not found',
            });
            continue;
          }

          sendEvent('server_start', {
            server_id,
            server_name: server.name,
            server_host: `${server.username}@${server.host}:${server.port}`,
            server_index: serverIndex + 1,
            total_servers: server_ids.length,
          });

          // 각 명령어 실행
          for (let cmdIndex = 0; cmdIndex < command_ids.length; cmdIndex++) {
            const command_id = command_ids[cmdIndex];

            const command = await prisma.checkCommand.findUnique({
              where: { id: parseInt(command_id) },
            });

            if (!command) {
              sendEvent('error', {
                server_id,
                command_id,
                message: 'Command not found',
              });
              continue;
            }

            sendEvent('command_start', {
              server_id,
              server_name: server.name,
              command_id,
              command_name: command.name,
              command_text: command.command,
              command_index: cmdIndex + 1,
              total_commands: command_ids.length,
            });

            // SSH 명령 실행 (스트리밍 버전)
            const result = await executeSSHCommandStreaming(
              server,
              command.command,
              // stdout 콜백
              (chunk) => {
                sendEvent('output', {
                  server_id,
                  command_id,
                  data: chunk,
                  type: 'stdout',
                });
              },
              // stderr 콜백
              (chunk) => {
                sendEvent('output', {
                  server_id,
                  command_id,
                  data: chunk,
                  type: 'stderr',
                });
              }
            );

            // 결과 저장
            const status: CheckStatus = result.success ? 'success' : (result.error ? 'error' : 'failed');

            await prisma.checkResult.create({
              data: {
                serverId: parseInt(server_id),
                commandId: parseInt(command_id),
                output: result.output || null,
                status,
                errorMessage: result.error || null,
                executionTime: result.executionTime,
              },
            });

            sendEvent('command_complete', {
              server_id,
              command_id,
              command_name: command.name,
              status,
              execution_time: result.executionTime,
            });
          }

          sendEvent('server_complete', {
            server_id,
            server_name: server.name,
            commands_executed: command_ids.length,
          });
        }

        sendEvent('complete', {
          message: 'All checks completed',
          total_servers: server_ids.length,
          total_commands: command_ids.length,
        });

        controller.close();
      } catch (error: any) {
        sendEvent('error', {
          message: 'Execution failed',
          details: error.message,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
