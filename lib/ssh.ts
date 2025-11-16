import { Client, ConnectConfig } from 'ssh2';
import { Server, SSHTunnel, TunnelType } from './types';
import net from 'net';

export interface SSHExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
}

// SSH 연결 설정 생성
function createSSHConfig(server: Server): ConnectConfig {
  const config: ConnectConfig = {
    host: server.host,
    port: server.port || 22,
    username: server.username,
    readyTimeout: 30000,
  };

  // 인증 방식 설정
  if (server.authType === 'password' && server.password) {
    config.password = server.password;
  } else if (server.authType === 'key' && server.privateKey) {
    config.privateKey = server.privateKey;
  }

  return config;
}

// SSH 명령어 실행
export async function executeSSHCommand(
  server: Server,
  command: string
): Promise<SSHExecutionResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const conn = new Client();
    let output = '';
    let errorOutput = '';

    const config = createSSHConfig(server);

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

// SSH 연결 테스트
export async function testSSHConnection(server: Server): Promise<boolean> {
  try {
    const result = await executeSSHCommand(server, 'echo "Connection test"');
    return result.success;
  } catch (error) {
    return false;
  }
}

// SSH 터널링 관리
export class SSHTunnelManager {
  private activeTunnels: Map<number, { client: Client; server: net.Server }> = new Map();

  // Local Port Forwarding (-L)
  // 로컬의 localPort를 원격의 remoteHost:remotePort로 포워딩
  async createLocalTunnel(
    server: Server,
    tunnel: SSHTunnel
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const conn = new Client();
      const config = createSSHConfig(server);

      conn.on('ready', () => {
        // 로컬 서버 생성
        const localServer = net.createServer((localSocket) => {
          conn.forwardOut(
            '127.0.0.1',
            tunnel.localPort,
            tunnel.remoteHost,
            tunnel.remotePort,
            (err, stream) => {
              if (err) {
                localSocket.end();
                console.error('Port forwarding error:', err);
                return;
              }

              localSocket.pipe(stream).pipe(localSocket);

              localSocket.on('error', (err) => {
                console.error('Local socket error:', err);
                stream.end();
              });

              stream.on('error', (err) => {
                console.error('Remote stream error:', err);
                localSocket.end();
              });
            }
          );
        });

        localServer.listen(tunnel.localPort, '127.0.0.1', () => {
          console.log(
            `Local tunnel started: localhost:${tunnel.localPort} -> ${tunnel.remoteHost}:${tunnel.remotePort}`
          );
          this.activeTunnels.set(tunnel.id, { client: conn, server: localServer });
          resolve({ success: true });
        });

        localServer.on('error', (err) => {
          conn.end();
          resolve({ success: false, error: `Local server error: ${err.message}` });
        });
      }).on('error', (err) => {
        resolve({ success: false, error: `SSH connection error: ${err.message}` });
      });

      conn.connect(config);
    });
  }

  // Remote Port Forwarding (-R)
  // 원격의 remotePort를 로컬의 localHost:localPort로 포워딩
  async createRemoteTunnel(
    server: Server,
    tunnel: SSHTunnel
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const conn = new Client();
      const config = createSSHConfig(server);

      conn.on('ready', () => {
        conn.forwardIn('0.0.0.0', tunnel.remotePort, (err) => {
          if (err) {
            conn.end();
            resolve({ success: false, error: `Remote forwarding error: ${err.message}` });
            return;
          }

          console.log(
            `Remote tunnel started: remote:${tunnel.remotePort} -> localhost:${tunnel.localPort}`
          );
          this.activeTunnels.set(tunnel.id, { client: conn, server: null as any });
          resolve({ success: true });
        });

        conn.on('tcp connection', (info, accept, reject) => {
          const remoteSocket = accept();
          const localSocket = net.connect(tunnel.localPort, '127.0.0.1');

          remoteSocket.pipe(localSocket).pipe(remoteSocket);

          remoteSocket.on('error', (err) => {
            console.error('Remote socket error:', err);
            localSocket.end();
          });

          localSocket.on('error', (err) => {
            console.error('Local socket error:', err);
            remoteSocket.end();
          });
        });
      }).on('error', (err) => {
        resolve({ success: false, error: `SSH connection error: ${err.message}` });
      });

      conn.connect(config);
    });
  }

  // Dynamic Port Forwarding (-D) - SOCKS Proxy
  async createDynamicTunnel(
    server: Server,
    tunnel: SSHTunnel
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const conn = new Client();
      const config = createSSHConfig(server);

      conn.on('ready', () => {
        // SOCKS5 프록시 서버 구현 (간단한 버전)
        const socksServer = net.createServer((socket) => {
          socket.once('data', (data) => {
            // SOCKS5 handshake
            if (data[0] === 5) {
              // Version 5
              socket.write(Buffer.from([5, 0])); // No authentication

              socket.once('data', (data) => {
                const cmd = data[1];
                const addressType = data[3];

                let destHost: string;
                let destPort: number;
                let offset = 4;

                if (addressType === 1) {
                  // IPv4
                  destHost = `${data[offset]}.${data[offset + 1]}.${data[offset + 2]}.${data[offset + 3]}`;
                  offset += 4;
                } else if (addressType === 3) {
                  // Domain name
                  const domainLength = data[offset];
                  offset += 1;
                  destHost = data.toString('utf8', offset, offset + domainLength);
                  offset += domainLength;
                } else {
                  socket.end();
                  return;
                }

                destPort = data.readUInt16BE(offset);

                if (cmd === 1) {
                  // CONNECT
                  conn.forwardOut('127.0.0.1', 0, destHost, destPort, (err, stream) => {
                    if (err) {
                      socket.write(Buffer.from([5, 1, 0, 1, 0, 0, 0, 0, 0, 0])); // General failure
                      socket.end();
                      return;
                    }

                    socket.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0])); // Success
                    socket.pipe(stream).pipe(socket);
                  });
                }
              });
            }
          });
        });

        socksServer.listen(tunnel.localPort, '127.0.0.1', () => {
          console.log(`Dynamic tunnel (SOCKS proxy) started on port ${tunnel.localPort}`);
          this.activeTunnels.set(tunnel.id, { client: conn, server: socksServer });
          resolve({ success: true });
        });

        socksServer.on('error', (err) => {
          conn.end();
          resolve({ success: false, error: `SOCKS server error: ${err.message}` });
        });
      }).on('error', (err) => {
        resolve({ success: false, error: `SSH connection error: ${err.message}` });
      });

      conn.connect(config);
    });
  }

  // 터널 시작
  async startTunnel(
    server: Server,
    tunnel: SSHTunnel
  ): Promise<{ success: boolean; error?: string }> {
    // 이미 활성화된 터널이 있으면 중지
    if (this.activeTunnels.has(tunnel.id)) {
      await this.stopTunnel(tunnel.id);
    }

    switch (tunnel.tunnelType) {
      case 'local':
        return this.createLocalTunnel(server, tunnel);
      case 'remote':
        return this.createRemoteTunnel(server, tunnel);
      case 'dynamic':
        return this.createDynamicTunnel(server, tunnel);
      default:
        return { success: false, error: 'Unknown tunnel type' };
    }
  }

  // 터널 중지
  async stopTunnel(tunnelId: number): Promise<void> {
    const tunnel = this.activeTunnels.get(tunnelId);
    if (tunnel) {
      tunnel.client.end();
      if (tunnel.server) {
        tunnel.server.close();
      }
      this.activeTunnels.delete(tunnelId);
      console.log(`Tunnel ${tunnelId} stopped`);
    }
  }

  // 터널 상태 확인
  isTunnelActive(tunnelId: number): boolean {
    return this.activeTunnels.has(tunnelId);
  }

  // 모든 터널 중지
  async stopAllTunnels(): Promise<void> {
    for (const tunnelId of this.activeTunnels.keys()) {
      await this.stopTunnel(tunnelId);
    }
  }
}

// 싱글톤 인스턴스
export const tunnelManager = new SSHTunnelManager();
