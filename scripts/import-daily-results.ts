import { PrismaClient, CheckStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ResultData {
  [serverName: string]: {
    [checkName: string]: string;
  };
}

/**
 * result.json의 결과 텍스트를 파싱하여 CheckStatus와 output 반환
 */
function parseCheckResult(
  checkName: string,
  resultText: string
): { status: CheckStatus; output: string } {
  // "정상(...)" 또는 "조정완료(...)" 형태 파싱
  if (resultText.startsWith('정상')) {
    return {
      status: CheckStatus.success,
      output: resultText,
    };
  } else if (resultText.startsWith('조정완료')) {
    return {
      status: CheckStatus.success,
      output: resultText,
    };
  } else if (resultText.startsWith('상') || resultText.startsWith('중') || resultText.startsWith('하')) {
    // 메모리/CPU 등급 표시
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

/**
 * 날짜 문자열이 yyyy-MM-dd 형식인지 확인
 */
function isValidDateFolder(folderName: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(folderName);
}

/**
 * 날짜별 폴더에서 result.json을 읽어서 import
 */
async function importDateFolder(basePath: string, dateFolder: string): Promise<{
  imported: number;
  skipped: number;
}> {
  const folderPath = path.join(basePath, dateFolder);
  const resultPath = path.join(folderPath, 'result.json');

  // result.json 파일이 없으면 스킵
  if (!fs.existsSync(resultPath)) {
    console.warn(`⚠ result.json not found in ${dateFolder}`);
    return { imported: 0, skipped: 0 };
  }

  console.log(`\n📅 Processing ${dateFolder}...`);

  const resultData: ResultData = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));

  // 날짜 파싱 (yyyy-MM-dd)
  const checkedAt = new Date(dateFolder + 'T00:00:00');

  let importedCount = 0;
  let skippedCount = 0;

  // 각 서버별로 결과 처리
  for (const [serverName, checks] of Object.entries(resultData)) {
    // 서버 찾기
    const server = await prisma.server.findFirst({
      where: { name: serverName },
    });

    if (!server) {
      console.warn(`  ⚠ Server not found: ${serverName}`);
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
        console.warn(`  ⚠ Command not found: ${checkName}`);
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
          checkedAt, // 폴더 날짜로 설정
        },
      });

      importedCount++;
      console.log(`  ✓ ${serverName} - ${checkName}`);
    }
  }

  return { imported: importedCount, skipped: skippedCount };
}

async function main() {
  // 명령줄 인자로 베이스 디렉토리 경로 받기
  const basePath = process.argv[2];

  if (!basePath) {
    console.error('❌ Error: Base directory path is required');
    console.log('\nUsage:');
    console.log('  npm run import:daily <base-directory-path>');
    console.log('\nExample:');
    console.log('  npm run import:daily D:\\CheckResults');
    console.log('\nDirectory structure expected:');
    console.log('  D:\\CheckResults\\');
    console.log('    ├── 2024-01-01\\');
    console.log('    │   ├── result.json');
    console.log('    │   ├── 서버1.txt');
    console.log('    │   └── 서버2.txt');
    console.log('    ├── 2024-01-02\\');
    console.log('    │   └── result.json');
    console.log('    └── ...');
    process.exit(1);
  }

  if (!fs.existsSync(basePath)) {
    console.error(`❌ Error: Directory not found: ${basePath}`);
    process.exit(1);
  }

  console.log('🚀 Starting daily results import...');
  console.log(`📁 Base directory: ${basePath}\n`);

  // 베이스 디렉토리의 모든 폴더 읽기
  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  const dateFolders = entries
    .filter((entry) => entry.isDirectory() && isValidDateFolder(entry.name))
    .map((entry) => entry.name)
    .sort(); // 날짜 순으로 정렬

  if (dateFolders.length === 0) {
    console.warn('⚠ No date folders (yyyy-MM-dd) found in the directory');
    process.exit(0);
  }

  console.log(`Found ${dateFolders.length} date folders`);

  let totalImported = 0;
  let totalSkipped = 0;

  // 각 날짜 폴더 처리
  for (const dateFolder of dateFolders) {
    const { imported, skipped } = await importDateFolder(basePath, dateFolder);
    totalImported += imported;
    totalSkipped += skipped;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary');
  console.log('='.repeat(50));
  console.log(`📅 Processed folders: ${dateFolders.length}`);
  console.log(`✓ Imported results: ${totalImported}`);
  console.log(`⚠ Skipped results: ${totalSkipped}`);
  console.log('='.repeat(50));
  console.log('\n✅ Import completed successfully!');
}

main()
  .catch((e) => {
    console.error('\n❌ Error importing results:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
