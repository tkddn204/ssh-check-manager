'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { dashboardApi } from '@/lib/api';

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

interface DailyResultDetail {
  id: number;
  command_name: string;
  command: string;
  status: string;
  output: string | null;
  error_message: string | null;
  checked_at: string;
}

interface ServerResult {
  server_id: number;
  server_name: string;
  host: string;
  port: number;
  results: DailyResultDetail[];
  success_count: number;
  failed_count: number;
}

interface DailyResults {
  date: string;
  server_results: ServerResult[];
  total_servers: number;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dailyResults, setDailyResults] = useState<DailyResults | null>(null);
  const [loadingDailyResults, setLoadingDailyResults] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;

      const result = await dashboardApi.getMonthlyStatus(year, month);
      setData(result);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyResults = async (date: string) => {
    try {
      setLoadingDailyResults(true);
      const result = await dashboardApi.getDailyResults(date);
      setDailyResults(result);
    } catch (error) {
      console.error('Failed to fetch daily results:', error);
    } finally {
      setLoadingDailyResults(false);
    }
  };

  const getCalendarDays = () => {
    if (!data) return [];
    const monthStart = startOfMonth(new Date(data.year, data.month - 1));
    const monthEnd = endOfMonth(new Date(data.year, data.month - 1));
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const getDayStatus = (date: Date) => {
    if (!data) return null;
    const dayKey = format(date, 'yyyy-MM-dd');

    let totalSuccess = 0;
    let totalFailed = 0;
    let hasConnection = false;

    data.monthlyStatus.forEach((server) => {
      const status = server.dailyStatus[dayKey];
      if (status && status.hasConnection) {
        hasConnection = true;
        totalSuccess += status.successCount;
        totalFailed += status.failedCount;
      }
    });

    return { hasConnection, totalSuccess, totalFailed };
  };

  const getDayStatusColor = (date: Date) => {
    const status = getDayStatus(date);
    if (!status || !status.hasConnection) {
      return 'bg-gray-100 text-gray-400';
    }
    if (status.totalFailed > 0) {
      return 'bg-red-100 text-red-800 border-red-500';
    }
    return 'bg-green-100 text-green-800 border-green-500';
  };

  const isCurrentMonth = (date: Date) => {
    if (!data) return false;
    return date.getMonth() === data.month - 1;
  };

  const handleDateClick = (date: Date) => {
    const dayKey = format(date, 'yyyy-MM-dd');
    const status = getDayStatus(date);

    if (status && status.hasConnection) {
      setSelectedDate(dayKey);
      fetchDailyResults(dayKey);
      setExpandedServers(new Set());
    }
  };

  const closeModal = () => {
    setSelectedDate(null);
    setDailyResults(null);
    setExpandedServers(new Set());
  };

  const toggleServerExpand = (serverId: number) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
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

  const calendarDays = getCalendarDays();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

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
          <>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {/* Week Day Headers */}
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`bg-gray-50 py-2 text-center text-sm font-semibold ${
                    index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {calendarDays.map((date) => {
                const status = getDayStatus(date);
                const isOtherMonth = !isCurrentMonth(date);
                const hasData = status && status.hasConnection;
                const dayOfWeek = getDay(date);

                return (
                  <div
                    key={format(date, 'yyyy-MM-dd')}
                    onClick={() => hasData && handleDateClick(date)}
                    className={`
                      bg-white min-h-24 p-2 relative
                      ${isOtherMonth ? 'opacity-40' : ''}
                      ${hasData ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}
                    `}
                  >
                    <div
                      className={`
                        text-sm font-medium mb-1
                        ${dayOfWeek === 0 ? 'text-red-600' : dayOfWeek === 6 ? 'text-blue-600' : 'text-gray-900'}
                      `}
                    >
                      {format(date, 'd')}
                    </div>

                    {status && status.hasConnection && (
                      <div className="space-y-1">
                        {status.totalSuccess > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-green-700">성공</span>
                            <span className="font-semibold text-green-800">{status.totalSuccess}</span>
                          </div>
                        )}
                        {status.totalFailed > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-red-700">실패</span>
                            <span className="font-semibold text-red-800">{status.totalFailed}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {status && status.hasConnection && (
                      <div className={`
                        absolute bottom-1 right-1 w-3 h-3 rounded-full
                        ${status.totalFailed > 0 ? 'bg-red-500' : 'bg-green-500'}
                      `} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>모두 성공</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>실패 포함</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span>점검 없음</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            등록된 서버가 없습니다.{' '}
            <Link href="/servers" className="text-blue-600 hover:text-blue-500">
              서버를 추가
            </Link>
            해주세요.
          </div>
        )}
      </div>

      {/* Daily Results Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={closeModal}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                <h3 className="text-lg font-semibold text-gray-900">
                  {format(new Date(selectedDate), 'yyyy년 M월 d일')} 점검 결과
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4">
                {loadingDailyResults ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-gray-500">로딩 중...</div>
                  </div>
                ) : dailyResults && dailyResults.server_results.length > 0 ? (
                  <div className="space-y-4">
                    {dailyResults.server_results.map((server) => (
                      <div
                        key={server.server_id}
                        className="border rounded-lg overflow-hidden"
                      >
                        {/* Server Header */}
                        <div
                          className="bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100"
                          onClick={() => toggleServerExpand(server.server_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                  {server.server_name}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  {server.host}:{server.port}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-3 text-sm">
                                {server.success_count > 0 && (
                                  <span className="text-green-700">
                                    성공: <span className="font-semibold">{server.success_count}</span>
                                  </span>
                                )}
                                {server.failed_count > 0 && (
                                  <span className="text-red-700">
                                    실패: <span className="font-semibold">{server.failed_count}</span>
                                  </span>
                                )}
                              </div>
                              <svg
                                className={`w-5 h-5 text-gray-400 transition-transform ${
                                  expandedServers.has(server.server_id) ? 'transform rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Server Results */}
                        {expandedServers.has(server.server_id) && (
                          <div className="divide-y">
                            {server.results.map((result) => (
                              <div key={result.id} className="px-4 py-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {result.command_name}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                          result.status === 'success'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}
                                      >
                                        {result.status === 'success' ? '성공' : '실패'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 font-mono">
                                      {result.command}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {format(new Date(result.checked_at), 'HH:mm:ss')}
                                    </p>
                                  </div>
                                </div>

                                {result.output && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-gray-700 mb-1">출력:</div>
                                    <pre className="text-xs bg-gray-50 rounded p-2 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                      {result.output}
                                    </pre>
                                  </div>
                                )}

                                {result.error_message && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-red-700 mb-1">에러:</div>
                                    <pre className="text-xs bg-red-50 rounded p-2 whitespace-pre-wrap break-words max-h-40 overflow-y-auto text-red-800">
                                      {result.error_message}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    해당 날짜에 점검 결과가 없습니다.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4">
                <button
                  onClick={closeModal}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
