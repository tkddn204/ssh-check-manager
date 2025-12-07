'use client';

import { useEffect, useState } from 'react';

interface CommandResult {
  command_id: number;
  command_name: string;
  result: {
    status: 'success' | 'failed' | 'error';
    output: string | null;
  } | null;
}

interface ServerStatus {
  server_id: number;
  server_name: string;
  server_host: string;
  server_description: string | null;
  command_results: CommandResult[];
}

// 서버 이름 매핑 (한글 표시)
const serverNameMap: { [key: string]: string } = {
  gijang: '기장',
  muan: '무안',
  yeosu: '여수',
  tashu: '대전',
  wonju: '원주',
  gongju: '공주',
  suncheon: '순천',
};

// 점검 항목 매핑
const checkKeys = [
  '시간 점검',
  '하드 용량 점검',
  '메모리 사용량 점검',
  'CPU 사용량 점검',
  'DB 백업 파일 점검',
  'DB log 파일 점검',
];

export default function StatusSummaryPage() {
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServerStatus();
  }, []);

  const fetchServerStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/server-status');
      const data = await response.json();
      setServers(data.servers || []);
    } catch (error) {
      console.error('Failed to fetch server status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatServerName = (serverName: string): string => {
    const parts = serverName.split('_');
    if (parts.length >= 2 && serverNameMap[parts[0]]) {
      return `${serverNameMap[parts[0]]} - ${parts[1].toUpperCase()}`;
    }
    return serverName;
  };

  const getResultDisplay = (commandName: string, result: CommandResult['result']) => {
    if (!result || !result.output) return '-';

    const output = result.output.trim();

    // "정상(...)" 형식이면 정상으로 표시
    if (output.startsWith('정상')) {
      return {
        text: output,
        isNormal: true,
      };
    }

    // 그 외는 빨간색으로 표시
    return {
      text: output,
      isNormal: false,
    };
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
          <h1 className="text-3xl font-bold text-gray-900">서버 상태 요약</h1>
          <p className="mt-2 text-sm text-gray-600">
            모든 서버의 최신 점검 결과를 한눈에 확인합니다
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
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    서버명
                  </th>
                  {checkKeys.map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {servers.map((server) => (
                  <tr key={server.server_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      {formatServerName(server.server_name)}
                    </td>
                    {checkKeys.map((checkKey) => {
                      const commandResult = server.command_results.find(
                        (cr) => cr.command_name === checkKey
                      );
                      const display = getResultDisplay(checkKey, commandResult?.result || null);

                      return (
                        <td
                          key={checkKey}
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            display.isNormal ? 'text-gray-900' : 'text-red-600 font-bold'
                          }`}
                        >
                          {display.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>표시 규칙:</strong> "정상(...)" 형식은 일반 텍스트로 표시되며, 그 외의 결과는
              빨간색 굵은 글씨로 강조 표시됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
