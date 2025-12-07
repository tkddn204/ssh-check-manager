/**
 * 표준 시간을 가져오는 유틸리티
 * example/time.js를 TypeScript로 변환
 * 네이버 서버 시간 또는 time.bora.net 시간을 사용
 */

import * as net from 'net';
import * as https from 'https';

export interface TimeResult {
  from: 'naver' | 'bora';
  datetime: Date;
}

/**
 * time.bora.net 서버에서 시간 정보를 가져옴
 * Time Protocol (RFC 868) 사용 - 포트 37
 */
export function getBoraTime(): Promise<Date> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let buffer = Buffer.alloc(4);

    // time.bora.net의 포트 37로 연결
    client.connect(37, 'time.bora.net');

    client.on('data', (data) => {
      buffer = data;
      // 네트워크 바이트 순서를 호스트 바이트 순서로 변경
      const secondsSince1900 = buffer.readUInt32BE(0);
      // Unix epoch (1970-01-01)과 NTP epoch (1900-01-01)의 차이를 빼기
      const epochTime = secondsSince1900 - 2208988800;
      const date = new Date(epochTime * 1000);
      resolve(date);
      client.destroy();
    });

    client.on('error', (err) => {
      reject(err);
    });

    // 타임아웃 설정 (5초)
    client.setTimeout(5000, () => {
      client.destroy();
      reject(new Error('Bora time server timeout'));
    });
  });
}

/**
 * 특정 호스트의 HTTP 응답 헤더에서 서버 시간 가져오기
 * @param hostname - 대상 호스트 (예: "naver.com")
 */
export function getServerTime(hostname: string): Promise<Date> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      method: 'HEAD', // HEAD 요청은 응답 본문 없이 헤더만 받음
    };

    const req = https.request(options, (res) => {
      const serverTime = res.headers['date'];
      if (serverTime && typeof serverTime === 'string') {
        const serverDateTime = new Date(serverTime);
        resolve(serverDateTime);
      } else {
        reject(new Error('Date header not found'));
      }
    });

    req.on('error', (e) => {
      reject(e);
    });

    // 타임아웃 설정 (5초)
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`${hostname} timeout`));
    });

    req.end();
  });
}

/**
 * 네이버 서버 시간 가져오기
 */
export const getNaverServerTime = (): Promise<Date> => getServerTime('naver.com');

/**
 * 표준 시간 가져오기
 * 1순위: 네이버 서버 시간
 * 2순위: bora.net 시간 서버
 */
export const getTime = async (): Promise<TimeResult> => {
  try {
    // 1. 네이버 서버 시간 시도
    const datetime = await getNaverServerTime();
    return {
      from: 'naver',
      datetime,
    };
  } catch (e) {
    try {
      // 2. bora.net 시간 서버 시도
      const datetime = await getBoraTime();
      return {
        from: 'bora',
        datetime,
      };
    } catch (e2) {
      // 둘 다 실패하면 에러 발생
      throw new Error('Failed to get time from both naver and bora');
    }
  }
};
