import {
  Server as PrismaServer,
  SSHTunnel as PrismaSSHTunnel,
  CheckCommand as PrismaCheckCommand,
  CheckResult as PrismaCheckResult,
  AuthType,
  CheckStatus,
  TunnelType,
  ClientType
} from '@prisma/client';

// Prisma 타입 재export
export type {
  AuthType,
  CheckStatus,
  TunnelType,
  ClientType
};

// 서버 타입
export type Server = PrismaServer;

// SSH 터널 타입
export type SSHTunnel = PrismaSSHTunnel;

// 점검 명령어 타입
export type CheckCommand = PrismaCheckCommand;

// 점검 결과 타입
export type CheckResult = PrismaCheckResult;

// 점검 결과 상세 정보 (Join된 데이터)
export interface CheckResultWithDetails extends CheckResult {
  server: {
    id: number;
    name: string;
    host: string;
  };
  command: {
    id: number;
    name: string;
    command: string;
  };
}

// 일별 리포트
export interface DailyReport {
  date: string;
  total_checks: number;
  success_count: number;
  failed_count: number;
  error_count: number;
  avg_execution_time: number;
}

// 월별 리포트
export interface MonthlyReport {
  month: string;
  total_checks: number;
  success_count: number;
  failed_count: number;
  error_count: number;
  avg_execution_time: number;
}

// 서버별 월간 접속 기록
export interface ServerMonthlyStatus {
  serverId: number;
  serverName: string;
  host: string;
  port: number;
  dailyStatus: {
    [day: string]: {
      hasConnection: boolean;
      successCount: number;
      failedCount: number;
      lastCheckedAt?: Date;
    };
  };
}

// 클라이언트 설정 (VPN, 특별 프로그램 등)
export interface ClientConfig {
  // VPN 설정
  vpnName?: string;
  vpnExecutablePath?: string;
  vpnConfigPath?: string;

  // 웹 포털 설정
  webPortalUrl?: string;
  webPortalInstructions?: string;

  // 커스텀 앱 설정
  customAppName?: string;
  customAppPath?: string;
  customAppArgs?: string[];

  // Bastion 호스트 설정
  bastionHost?: string;
  bastionPort?: number;
  bastionUsername?: string;
  bastionAuthType?: AuthType;
  bastionPassword?: string;
  bastionPrivateKey?: string;

  // 추가 설명
  notes?: string;
}

// SSH 터널 생성 요청
export interface CreateTunnelRequest {
  serverId: number;
  name: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  tunnelType: TunnelType;
  description?: string;
}

// SSH 터널 상태
export interface TunnelStatus {
  tunnel: SSHTunnel;
  isActive: boolean;
  error?: string;
}
