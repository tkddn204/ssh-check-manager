'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

interface ServerMonthlyStatus {
  serverId: number;
  serverName: string;
  host: string;
  port: number;
  dailyStatus: {
    [day: string]: {
      hasConnection: boolean;
      successCount: number;
      failedCount: number;
      lastCheckedAt?: string;
    };
  };
}

interface DashboardData {
  year: number;
  month: number;
  monthlyStatus: ServerMonthlyStatus[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;

      const response = await fetch(`/api/dashboard/monthly-status?year=${year}&month=${month}`);
      const result = await response.json();

      setData(result);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    if (!data) return [];
    const start = startOfMonth(new Date(data.year, data.month - 1));
    const end = endOfMonth(new Date(data.year, data.month - 1));
    return eachDayOfInterval({ start, end });
  };

  const getStatusColor = (status: { hasConnection: boolean; successCount: number; failedCount: number }) => {
    if (!status.hasConnection) {
      return 'bg-gray-200'; // 접속 없음
    }
    if (status.failedCount > 0) {
      return 'bg-red-500'; // 실패 있음
    }
    return 'bg-green-500'; // 모두 성공
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedMonth(newDate);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const days = getDaysInMonth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-2 text-sm text-gray-600">
          서버별 월간 접속 현황을 확인하세요
        </p>
      </div>

      {/* 빠른 시작 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">빠른 시작</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/servers"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
          >
            <div className="flex-shrink-0">
              <span className="text-2xl">➕</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">서버 추가</p>
              <p className="text-sm text-gray-500 truncate">
                새로운 서버 등록
              </p>
            </div>
          </Link>

          <Link
            href="/checks"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
          >
            <div className="flex-shrink-0">
              <span className="text-2xl">🔍</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">점검 실행</p>
              <p className="text-sm text-gray-500 truncate">
                서버 상태 점검
              </p>
            </div>
          </Link>

          <Link
            href="/reports"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
          >
            <div className="flex-shrink-0">
              <span className="text-2xl">📈</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">리포트 보기</p>
              <p className="text-sm text-gray-500 truncate">
                일별/월별 통계
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 월간 접속 현황 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">서버별 월간 접속 현황</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => changeMonth(-1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              이전 달
            </button>
            <span className="font-medium">
              {data && `${data.year}년 ${data.month}월`}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              다음 달
            </button>
          </div>
        </div>

        {data && data.monthlyStatus.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    서버
                  </th>
                  {days.map((day) => (
                    <th
                      key={format(day, 'yyyy-MM-dd')}
                      className="px-2 py-2 text-center text-xs font-medium text-gray-500"
                    >
                      {format(day, 'd')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.monthlyStatus.map((server) => (
                  <tr key={server.serverId}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r">
                      <div className="text-sm font-medium text-gray-900">
                        {server.serverName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {server.host}:{server.port}
                      </div>
                    </td>
                    {days.map((day) => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const status = server.dailyStatus[dayKey];
                      return (
                        <td
                          key={dayKey}
                          className="px-2 py-3 text-center"
                          title={
                            status.hasConnection
                              ? `성공: ${status.successCount}, 실패: ${status.failedCount}`
                              : '접속 없음'
                          }
                        >
                          <div
                            className={`w-6 h-6 mx-auto rounded ${getStatusColor(status)}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            등록된 서버가 없습니다.{' '}
            <Link href="/servers" className="text-blue-600 hover:text-blue-500">
              서버를 추가
            </Link>
            해주세요.
          </div>
        )}

        {/* 범례 */}
        <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            <span>접속 성공</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-red-500 rounded"></div>
            <span>접속 실패</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <span>접속 없음</span>
          </div>
        </div>
      </div>
    </div>
  );
}
