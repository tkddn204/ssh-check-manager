'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface DailyReport {
  date: string;
  total_checks: number;
  success_count: number;
  failed_count: number;
  error_count: number;
  avg_execution_time: number;
}

interface MonthlyReport {
  month: string;
  total_checks: number;
  success_count: number;
  failed_count: number;
  error_count: number;
  avg_execution_time: number;
}

export default function ReportsPage() {
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [days, setDays] = useState(30);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [days, months]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [dailyRes, monthlyRes] = await Promise.all([
        fetch(`/api/reports/daily?days=${days}`),
        fetch(`/api/reports/monthly?months=${months}`),
      ]);

      const dailyData = await dailyRes.json();
      const monthlyData = await monthlyRes.json();

      setDailyReports(dailyData.reports || []);
      setMonthlyReports(monthlyData.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year}년 ${month}월`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const currentData = viewMode === 'daily' ? dailyReports : monthlyReports;
  const hasData = currentData.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">리포트</h1>
        <p className="mt-2 text-sm text-gray-600">
          점검 결과 통계를 일별/월별로 확인합니다
        </p>
      </div>

      {/* 컨트롤 패널 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">보기:</label>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                viewMode === 'daily'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              일별
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                viewMode === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              월별
            </button>
          </div>

          {viewMode === 'daily' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">기간:</label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="block border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value={7}>최근 7일</option>
                <option value={14}>최근 14일</option>
                <option value={30}>최근 30일</option>
                <option value={60}>최근 60일</option>
                <option value={90}>최근 90일</option>
              </select>
            </div>
          )}

          {viewMode === 'monthly' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">기간:</label>
              <select
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value))}
                className="block border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value={6}>최근 6개월</option>
                <option value={12}>최근 12개월</option>
                <option value={24}>최근 24개월</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500">해당 기간에 데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 점검 수 차트 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {viewMode === 'daily' ? '일별' : '월별'} 점검 수
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[...currentData].reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={viewMode === 'daily' ? 'date' : 'month'}
                  tickFormatter={viewMode === 'daily' ? formatDate : formatMonth}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) =>
                    viewMode === 'daily' ? formatDate(label) : formatMonth(label)
                  }
                />
                <Legend />
                <Bar dataKey="success_count" fill="#10b981" name="성공" />
                <Bar dataKey="failed_count" fill="#f59e0b" name="실패" />
                <Bar dataKey="error_count" fill="#ef4444" name="에러" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 평균 실행 시간 차트 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              평균 실행 시간 (ms)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[...currentData].reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={viewMode === 'daily' ? 'date' : 'month'}
                  tickFormatter={viewMode === 'daily' ? formatDate : formatMonth}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) =>
                    viewMode === 'daily' ? formatDate(label) : formatMonth(label)
                  }
                  formatter={(value: any) => [
                    `${Math.round(value)}ms`,
                    '평균 실행 시간',
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_execution_time"
                  stroke="#3b82f6"
                  name="평균 실행 시간"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 상세 데이터 테이블 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              상세 데이터
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {viewMode === 'daily' ? '날짜' : '월'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      총 점검
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      성공
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      실패
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      에러
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      성공률
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      평균 실행 시간
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentData.map((report, index) => {
                    const dateKey = viewMode === 'daily' ? 'date' : 'month';
                    const successRate =
                      report.total_checks > 0
                        ? ((report.success_count / report.total_checks) * 100).toFixed(
                            1
                          )
                        : '0';

                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {viewMode === 'daily'
                            ? formatDate((report as any)[dateKey])
                            : formatMonth((report as any)[dateKey])}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {report.total_checks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {report.success_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                          {report.failed_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {report.error_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {successRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.round(report.avg_execution_time)}ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
