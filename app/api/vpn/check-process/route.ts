import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { processName } = await request.json();

    if (!processName) {
      return NextResponse.json(
        { error: 'Process name is required' },
        { status: 400 }
      );
    }

    const isRunning = await checkProcess(processName);

    return NextResponse.json({
      process_name: processName,
      is_running: isRunning,
    });
  } catch (error) {
    console.error('Failed to check VPN process:', error);
    return NextResponse.json(
      { error: 'Failed to check VPN process' },
      { status: 500 }
    );
  }
}

async function checkProcess(processName: string): Promise<boolean> {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      // Windows: tasklist 명령 사용
      const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${processName}" /NH`);
      return stdout.toLowerCase().includes(processName.toLowerCase());
    } else {
      // Unix/Linux/macOS: pgrep 명령 사용
      try {
        // 프로세스 이름에서 확장자 제거 (.exe 등)
        const cleanProcessName = processName.replace(/\.(exe|app)$/i, '');
        await execAsync(`pgrep -x "${cleanProcessName}"`);
        return true;
      } catch (error) {
        // pgrep이 프로세스를 찾지 못하면 exit code 1을 반환
        return false;
      }
    }
  } catch (error) {
    console.error('Error checking process:', error);
    return false;
  }
}