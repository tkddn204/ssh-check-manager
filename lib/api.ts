/**
 * 중앙화된 API 클라이언트
 * 모든 API 호출을 관리하여 중복을 최소화합니다
 */

// 기본 fetch 래퍼
async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// GET 요청
async function get<T>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'GET' });
}

// POST 요청
async function post<T>(url: string, data: unknown): Promise<T> {
  return apiRequest<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// PUT 요청
async function put<T>(url: string, data: unknown): Promise<T> {
  return apiRequest<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// DELETE 요청
async function del<T>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'DELETE' });
}

// 서버 API
export const serversApi = {
  getAll: () => get<{ servers: any[] }>('/api/servers'),
  create: (data: any) => post('/api/servers', data),
  delete: (id: number) => del(`/api/servers/${id}`),
};

// 명령어 API
export const commandsApi = {
  getAll: () => get<{ commands: any[] }>('/api/commands'),
  create: (data: any) => post('/api/commands', data),
  update: (id: number, data: any) => put(`/api/commands/${id}`, data),
  delete: (id: number) => del(`/api/commands/${id}`),
};

// VPN 프로필 API
export const vpnApi = {
  getAll: () => get<{ vpn_profiles: any[] }>('/api/vpn'),
  create: (data: any) => post('/api/vpn', data),
  update: (id: number, data: any) => put(`/api/vpn/${id}`, data),
  delete: (id: number) => del(`/api/vpn/${id}`),
  checkProcess: (processName: string) =>
    post<{ is_running: boolean }>('/api/vpn/check-process', { processName }),
};

// 점검 API
export const checksApi = {
  getResults: (params?: { limit?: number; server_id?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.server_id) searchParams.append('server_id', params.server_id);
    if (params?.status) searchParams.append('status', params.status);
    return get<{ results: any[] }>(`/api/checks/results${searchParams.toString() ? `?${searchParams}` : ''}`);
  },
  executeBatch: (data: { server_ids: number[]; command_ids: number[] }) =>
    post('/api/checks/batch', data),
  // Stream은 별도 처리 필요 (fetch를 직접 사용)
  executeBatchStream: (data: { server_ids: number[]; command_ids: number[] }) =>
    fetch('/api/checks/batch-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
};

// 초기화 API
export const initApi = {
  initialize: () => post('/api/init', {}),
};

// 대시보드 API
export const dashboardApi = {
  getMonthlyStatus: (year: number, month: number) =>
    get<any>(`/api/dashboard/monthly-status?year=${year}&month=${month}`),
  getDailyResults: (date: string) =>
    get<any>(`/api/dashboard/daily-results?date=${date}`),
};

// 리포트 API
export const reportsApi = {
  getDaily: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return get<{ reports: any[] }>(`/api/reports/daily?${params}`);
  },
  getMonthly: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return get<{ reports: any[] }>(`/api/reports/monthly?${params}`);
  },
};

// 결과 API
export const resultsApi = {
  getAll: () => get<{ results: any[] }>('/api/results'),
};