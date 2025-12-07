'use client';

import { useEffect, useState } from 'react';

interface CommandResult {
  command_id: number;
  command_name: string;
  command_description: string | null;
  result: {
    id: number;
    status: 'success' | 'failed' | 'error';
    output: string | null;
    error_message: string | null;
    execution_time: number;
    checked_at: string;
  } | null;
}

interface ServerStatus {
  server_id: number;
  server_name: string;
  server_host: string;
  server_description: string | null;
  statistics: {
    total_checks: number;
    success_count: number;
    failed_count: number;
    error_count: number;
  };
  command_results: CommandResult[];
}

export default function ServerStatusPage() {
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedServers, setExpandedServers] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchServerStatus();
  }, []);

  const fetchServerStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/server-status');
      const data = await response.json();
      setServers(data.servers || []);

      // 기본적으로 모든 서버 확장
      const allServerIds = new Set<number>(data.servers.map((s: ServerStatus) => s.server_id));
      setExpandedServers(allServerIds);
    } catch (error) {
      console.error('Failed to fetch server status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleServer = (serverId: number) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  const getStatusColor = (status: 'success' | 'failed' | 'error') => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: 'success' | 'failed' | 'error') => {
    switch (status) {
      case 'success':
        return '정상';
      case 'failed':
        return '실패';
      case 'error':
        return '에러';
      default:
        return '알 수 없음';
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">서버 상태 보고서</h1>
          <p className="mt-2 text-sm text-gray-600">
            각 서버의 최신 점검 결과를 확인합니다
          </p>
        </div>
        <button
          onClick={fetchServerStatus}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          새로고침
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500">서버 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => {
            const isExpanded = expandedServers.has(server.server_id);
            const hasResults = server.command_results.some((cr) => cr.result !== null);
            const successRate =
              server.statistics.total_checks > 0
                ? (
                    (server.statistics.success_count / server.statistics.total_checks) *
                    100
                  ).toFixed(1)
                : '0';

            return (
              <div key={server.server_id} className="bg-white shadow rounded-lg overflow-hidden">
                {/* 서버 헤더 */}
                <div
                  className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleServer(server.server_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {server.server_name}
                        </h2>
                        <span className="text-sm text-gray-500">
                          ({server.server_host})
                        </span>
                      </div>
                      {server.server_description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {server.server_description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">총 점검</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {server.statistics.total_checks}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">성공률</div>
                        <div className="text-lg font-semibold text-green-600">
                          {successRate}%
                        </div>
                      </div>
                      <div className="text-gray-400">
                        <svg
                          className={`w-6 h-6 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 서버 상세 정보 */}
                {isExpanded && (
                  <div className="p-6">
                    {!hasResults ? (
                      <p className="text-gray-500 text-center py-8">
                        이 서버에 대한 점검 결과가 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {server.command_results.map((cmdResult) => {
                          if (!cmdResult.result) return null;

                          return (
                            <div
                              key={cmdResult.command_id}
                              className="border border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="text-md font-semibold text-gray-900">
                                    {cmdResult.command_name}
                                  </h3>
                                  {cmdResult.command_description && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      {cmdResult.command_description}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                                    cmdResult.result.status
                                  )}`}
                                >
                                  {getStatusText(cmdResult.result.status)}
                                </span>
                              </div>

                              {cmdResult.result.output && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                  <div className="text-sm font-medium text-gray-700 mb-1">
                                    결과:
                                  </div>
                                  <pre className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                                    {cmdResult.result.output}
                                  </pre>
                                </div>
                              )}

                              {cmdResult.result.error_message && (
                                <div className="mt-3 p-3 bg-red-50 rounded-md">
                                  <div className="text-sm font-medium text-red-700 mb-1">
                                    에러:
                                  </div>
                                  <pre className="text-sm text-red-900 whitespace-pre-wrap break-words">
                                    {cmdResult.result.error_message}
                                  </pre>
                                </div>
                              )}

                              <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                                <span>
                                  실행 시간: {cmdResult.result.execution_time}ms
                                </span>
                                <span>
                                  점검 시각: {formatDateTime(cmdResult.result.checked_at)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
