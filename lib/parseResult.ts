/**
 * SSH 명령어 실행 결과를 파싱하고 검증하는 유틸리티
 * example/parseResult.js를 TypeScript로 변환
 */

const TIME_DIFF_THRESHOLD = 5; // 시간 차이 임계값 (초)

export interface DateCheckResult {
  from: string;
  threshold: number;
  diff: number;
}

export interface CpuCheckResult {
  avg: number;
  maxVal: number;
}

/**
 * 날짜/시간 문자열을 파싱하고 표준 시간과 비교
 * @param dateStr - "YYYY-MM-DD HH:mm:ss" 형식의 날짜 문자열
 * @param referenceTime - 비교할 기준 시간 (Date 객체)
 */
export const parseAndCheckDate = async (
  dateStr: string,
  referenceTime: Date
): Promise<DateCheckResult> => {
  const resultDateTime = new Date(dateStr.trim());
  const diffMs = referenceTime.getTime() - resultDateTime.getTime();
  const diff = Math.round(diffMs / 1000); // 초 단위로 변환

  return {
    from: 'reference', // 기준 시간 출처 (네이버, bora 등)
    threshold: TIME_DIFF_THRESHOLD,
    diff,
  };
};

/**
 * df -h 출력 결과에서 디스크 사용률 파싱
 * @param dataStr - df -h 명령어 출력
 * @returns 사용률 배열 (내림차순 정렬)
 */
export const parseAndCheckCapacity = (dataStr: string): number[] => {
  return dataStr
    .trim()
    .split('\n')
    .slice(1) // 헤더 제외
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 5 && parts[4] !== '0%')
    .map((parts) => parseInt(parts[4].replace('%', ''), 10))
    .sort((a, b) => b - a); // 내림차순 정렬
};

/**
 * /proc/meminfo 출력에서 메모리 사용률 계산
 * @param dataStr - head /proc/meminfo 출력
 * @returns 메모리 사용률 (%)
 */
export const parseAndCheckMemory = (dataStr: string): number => {
  const lines = dataStr.split('\n');

  let memTotal = 0;
  let memAvailable = 0;

  lines.forEach((line) => {
    if (line.startsWith('MemTotal:')) {
      memTotal = parseInt(line.replace(/\D+/g, ''), 10);
    } else if (line.startsWith('MemAvailable:')) {
      memAvailable = parseInt(line.replace(/\D+/g, ''), 10);
    }
  });

  if (memTotal === 0) {
    throw new Error('MemTotal not found in meminfo');
  }

  const memUsed = memTotal - memAvailable;
  return parseFloat(((memUsed / memTotal) * 100).toFixed(2));
};

/**
 * CPU 사용률 데이터 배열에서 평균과 최대값 계산
 * @param data - CPU 사용률 문자열 배열 (예: ["5.23%", "12.45%"])
 * @returns 평균과 최대값
 */
export const parseAndCheckCpu = (data: string[]): CpuCheckResult => {
  const numbers = data.map((line) => parseFloat(line.replace('%', '')));

  const count = data.length;
  const sum = numbers.reduce((pre, cur) => pre + cur, 0);
  const avg = sum / count;
  const maxVal = numbers.reduce((pre, cur) => (pre > cur ? pre : cur), 0);

  return {
    avg,
    maxVal,
  };
};

/**
 * 백업 파일이 유효한지 검증
 * - 오늘 날짜인지
 * - 백업 시간대가 적절한지 (03:00 ~ 03:30)
 * - 파일 크기가 적절한지 (이전 파일의 50% 이상)
 */
const isValidBackupFile = (currentFile: string[], beforeFileSize: number): boolean => {
  const now = new Date();

  // ----------------------------- 월 부분 검사
  let month: number;
  const monthStr = currentFile[5].trim();
  if (monthStr.endsWith('월')) {
    month = parseInt(monthStr.replace('월', ''));
  } else {
    // 영문 월 (예: "Dec")
    const monthMap: { [key: string]: number } = {
      Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
      Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
    };
    month = monthMap[monthStr] || 0;
  }

  if (now.getMonth() + 1 !== month) {
    return false;
  }

  // ----------------------------- 일 부분 검사
  const day = parseInt(currentFile[6].trim());
  if (now.getDate() !== day) {
    return false;
  }

  // ----------------------------- 시간 부분 검사 (03:00 ~ 03:30)
  const timeStr = currentFile[7].trim();
  const [hour, minute] = timeStr.split(':').map((s) => parseInt(s));

  if (hour !== 3 || minute > 30) {
    return false;
  }

  // ----------------------------- 파일명 부분 검사
  const fileName = currentFile[8].trim();
  const regex = /_(\d{8})\.sql$/;
  const match = fileName.match(regex);

  if (!match) {
    throw new Error(`Invalid backup file format: ${fileName}`);
  }

  const dateStr = match[1]; // YYYYMMDD
  const fileYear = parseInt(dateStr.substring(0, 4));
  const fileMonth = parseInt(dateStr.substring(4, 6));
  const fileDay = parseInt(dateStr.substring(6, 8));

  if (
    fileYear !== now.getFullYear() ||
    fileMonth !== now.getMonth() + 1 ||
    fileDay !== now.getDate()
  ) {
    return false;
  }

  // ----------------------------- 파일크기 부분 검사
  const fileSize = parseInt(currentFile[4].trim());
  if (beforeFileSize > 0 && beforeFileSize / 2 > fileSize) {
    return false; // 이전 파일의 50% 미만이면 실패
  }

  return true;
};

/**
 * ls -al /backup 출력에서 DB 백업 파일 검증
 * @param dataStr - ls -al 출력
 * @returns 백업 파일이 유효한지 여부
 */
export const parseAndCheckDBBackup = (dataStr: string): boolean | Error => {
  const lines = dataStr.split('\n');

  try {
    const fileLines = lines.filter((line) => line.startsWith('-'));
    if (fileLines.length === 0) {
      return false;
    }

    let beforeFileSize = 0;
    if (fileLines.length >= 2) {
      const beforeFileParts = fileLines[fileLines.length - 2].trim().split(/\s+/);
      beforeFileSize = parseInt(beforeFileParts[4]);
    }

    const currentFileParts = fileLines[fileLines.length - 1].trim().split(/\s+/);
    return isValidBackupFile(currentFileParts, beforeFileSize);
  } catch (e) {
    console.error(e);
    return e as Error;
  }
};

/**
 * sudo ls -al /var/log/mysql 출력 검증
 * @param dataStr - ls -al 출력
 * @returns "정상" 또는 "조치필요"
 */
export const parseAndCheckDBLog = (dataStr: string): string => {
  // 로그 파일 출력 길이가 충분한지 확인
  return dataStr.length > 222 ? '정상' : '조치필요';
};

/**
 * 메모리 사용률에 따른 상태 등급 반환
 * @param memoryPercent - 메모리 사용률 (%)
 * @returns "정상" | "하" | "중" | "상"
 */
export const getMemoryStatus = (memoryPercent: number): string => {
  if (memoryPercent >= 90) return '상';
  if (memoryPercent >= 80) return '중';
  if (memoryPercent >= 70) return '하';
  return '정상';
};

/**
 * CPU 평균 사용률에 따른 상태 등급 반환
 * @param cpuAvg - CPU 평균 사용률 (%)
 * @returns "정상" | "하" | "중" | "상"
 */
export const getCpuStatus = (cpuAvg: number): string => {
  if (cpuAvg >= 70) return '상';
  if (cpuAvg >= 50) return '중';
  if (cpuAvg >= 30) return '하';
  return '정상';
};

/**
 * 디스크 사용률 배열에서 상태 판단
 * @param capacities - 디스크 사용률 배열
 * @returns 최대 사용률이 80% 미만이면 true
 */
export const isCapacityNormal = (capacities: number[]): boolean => {
  if (capacities.length === 0) return false;
  return capacities[0] < 80; // 최대 사용률이 80% 미만
};
