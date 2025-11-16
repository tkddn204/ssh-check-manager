'use client';

import { useEffect, useState } from 'react';

interface Server {
  id: number;
  name: string;
}

interface CheckResult {
  id: number;
  server_name: string;
  command_name: string;
  status: 'success' | 'failed' | 'error';
  output: string;
  error_message?: string;
  execution_time: number;
  checked_at: string;
}

export default function ResultsPage() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedResultId, setExpandedResultId] = useState<number | null>(null);
  const [filterServerId, setFilterServerId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchServers();
    fetchResults();
  }, [filterServerId, filterStatus, limit]);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      setServers(data.servers || []);
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (filterServerId) params.append('server_id', filterServerId);
      if (filterStatus) params.append('status', filterStatus);

      const res = await fetch(`/api/checks/results?${params}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
    };
    const labels = {
      success: '성공',
      failed: '실패',
      error: '에러',
    };
    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          badges[status as keyof typeof badges]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">점검 결과 내역</h1>
        <p className="mt-2 text-sm text-gray-600">
          모든 점검 결과를 조회하고 필터링할 수 있습니다
        </p>
      </div>

      {/* 필터 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">필터</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              서버
            </label>
            <select
              value={filterServerId}
              onChange={(e) => setFilterServerId(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">전체</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">전체</option>
              <option value="success">성공</option>
              <option value="failed">실패</option>
              <option value="error">에러</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              표시 개수
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="20">20개</option>
              <option value="50">50개</option>
              <option value="100">100개</option>
              <option value="200">200개</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setFilterServerId('');
              setFilterStatus('');
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            필터 초기화
          </button>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            점검 결과 ({results.length}개)
          </h2>
          <button
            onClick={fetchResults}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            새로고침
          </button>
        </div>

        {results.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            점검 결과가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    서버
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    명령어
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    실행 시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    점검 시각
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상세
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => (
                  <>
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.server_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.command_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(result.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.execution_time}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(result.checked_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() =>
                            setExpandedResultId(
                              expandedResultId === result.id ? null : result.id
                            )
                          }
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          {expandedResultId === result.id ? '숨기기' : '보기'}
                        </button>
                      </td>
                    </tr>
                    {expandedResultId === result.id && (
                      <tr key={`${result.id}-detail`}>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-3">
                            {result.output && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">
                                  실행 결과:
                                </h4>
                                <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-x-auto max-h-96">
                                  {result.output}
                                </pre>
                              </div>
                            )}
                            {result.error_message && (
                              <div>
                                <h4 className="text-sm font-medium text-red-900 mb-2">
                                  에러 메시지:
                                </h4>
                                <pre className="bg-red-50 p-3 rounded border border-red-200 text-xs text-red-900 overflow-x-auto max-h-96">
                                  {result.error_message}
                                </pre>
                              </div>
                            )}
                            {!result.output && !result.error_message && (
                              <p className="text-sm text-gray-500">
                                출력 결과가 없습니다.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
