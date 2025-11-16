import { Client, ConnectConfig } from 'ssh2';
import { Server } from './types';

export interface SSHExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
}

export async function executeSSHCommand(
  server: Server,
  command: string
): Promise<SSHExecutionResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const conn = new Client();
    let output = '';
    let errorOutput = '';

    const config: ConnectConfig = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 30000,
    };

    // 인증 방식 설정
    if (server.auth_type === 'password' && server.password) {
      config.password = server.password;
    } else if (server.auth_type === 'key' && server.private_key) {
      config.privateKey = server.private_key;
    }

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          resolve({
            success: false,
            error: err.message,
            executionTime: Date.now() - startTime,
          });
          return;
        }

        stream.on('close', (code: number, signal: string) => {
          conn.end();
          const executionTime = Date.now() - startTime;

          if (code === 0) {
            resolve({
              success: true,
              output: output || errorOutput,
              executionTime,
            });
          } else {
            resolve({
              success: false,
              output: output,
              error: errorOutput || `Command exited with code ${code}`,
              executionTime,
            });
          }
        }).on('data', (data: Buffer) => {
          output += data.toString('utf8');
        }).stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString('utf8');
        });
      });
    }).on('error', (err) => {
      resolve({
        success: false,
        error: `SSH Connection Error: ${err.message}`,
        executionTime: Date.now() - startTime,
      });
    });

    conn.connect(config);
  });
}

export async function testSSHConnection(server: Server): Promise<boolean> {
  try {
    const result = await executeSSHCommand(server, 'echo "Connection test"');
    return result.success;
  } catch (error) {
    return false;
  }
}
