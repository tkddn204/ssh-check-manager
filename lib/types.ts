export interface Server {
  id?: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  password?: string;
  private_key?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CheckCommand {
  id?: number;
  name: string;
  command: string;
  description?: string;
  created_at?: string;
}

export interface CheckResult {
  id?: number;
  server_id: number;
  command_id: number;
  output?: string;
  status: 'success' | 'failed' | 'error';
  error_message?: string;
  execution_time: number;
  checked_at?: string;
}

export interface CheckResultWithDetails extends CheckResult {
  server_name?: string;
  command_name?: string;
  command?: string;
}

export interface DailyReport {
  date: string;
  total_checks: number;
  success_count: number;
  failed_count: number;
  error_count: number;
  avg_execution_time: number;
}

export interface MonthlyReport {
  month: string;
  total_checks: number;
  success_count: number;
  failed_count: number;
  error_count: number;
  avg_execution_time: number;
}
