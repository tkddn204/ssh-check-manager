import { PrismaClient, CheckStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  getMemoryStatus,
  getCpuStatus,
  isCapacityNormal,
} from '../lib/parseResult';

const prisma = new PrismaClient();

interface ResultData {
  [serverName: string]: {
    [checkName: string]: string;
  };
}

/**
 * result.json의 결과 텍스트를 파싱하여 CheckStatus와 output 반환
 * 향상된 파싱 로직 적용 (메모리/CPU 등급 표시)
 */
function parseCheckResult(
  checkName: string,
  resultText: string
): { status: CheckStatus; output: string } {
  // "정상(...)" 또는 "조정완료(...)" 형태 파싱
  if (resultText.startsWith('정상')) {
    return {
      status: CheckStatus.success,
      output: resultText, // 전체 텍스트 유지
    };
  } else if (resultText.startsWith('조정완료')) {
    return {
      status: CheckStatus.success,
      output: resultText,
    };
  } else if (resultText.startsWith('상') || resultText.startsWith('중') || resultText.startsWith('하')) {
    // 메모리/CPU 등급 표시 - 상/중/하는 경고, 정상은 성공
    const level = resultText.charAt(0);
    if (level === '상') {
      return {
        status: CheckStatus.failed,
        output: resultText,
      };
    } else if (level === '중') {
      return {
        status: CheckStatus.failed,
        output: resultText,
      };
    } else {
      return {
        status: CheckStatus.success,
        output: resultText,
      };
    }
  } else if (resultText.startsWith('조치필요') || resultText.startsWith('조정필요')) {
    return {
      status: CheckStatus.failed,
      output: resultText,
    };
  } else if (resultText.startsWith('실패') || resultText.startsWith('오류')) {
    return {
      status: CheckStatus.error,
      output: resultText,
    };
  } else {
    return {
      status: CheckStatus.success,
      output: resultText,
    };
  }
}

async function main() {
  console.log('Starting result import...');

  // result.json 파일 읽기
  const resultPath = path.join(__dirname, '../example/result.json');
  const resultData: ResultData = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));

  let importedCount = 0;
  let skippedCount = 0;

  // 각 서버별로 결과 처리
  for (const [serverName, checks] of Object.entries(resultData)) {
    // 서버 찾기
    const server = await prisma.server.findFirst({
      where: { name: serverName },
    });

    if (!server) {
      console.warn(`⚠ Server not found: ${serverName}`);
      skippedCount += Object.keys(checks).length;
      continue;
    }

    // 각 점검 항목별로 결과 처리
    for (const [checkName, resultText] of Object.entries(checks)) {
      // 점검 명령어 찾기
      const command = await prisma.checkCommand.findFirst({
        where: { name: checkName },
      });

      if (!command) {
        console.warn(`⚠ Command not found: ${checkName}`);
        skippedCount++;
        continue;
      }

      // 결과 파싱
      const { status, output } = parseCheckResult(checkName, resultText);

      // CheckResult 생성
      await prisma.checkResult.create({
        data: {
          serverId: server.id,
          commandId: command.id,
          status,
          output,
          executionTime: 100, // 예제 데이터이므로 임의 값
          checkedAt: new Date(), // 현재 시간으로 설정
        },
      });

      importedCount++;
      console.log(`✓ Imported: ${serverName} - ${checkName}`);
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`✓ Imported: ${importedCount} results`);
  console.log(`⚠ Skipped: ${skippedCount} results`);
  console.log('Import completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error importing results:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
