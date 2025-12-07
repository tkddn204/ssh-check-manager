'use client';

import { useEffect, useState } from 'react';
import { serversApi, commandsApi, checksApi } from '@/lib/api';

interface Server {
  id: number;
  name: string;
}

interface Command {
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

interface FormData {
  server_id: string;
  command_id: string;
  output: string;
  status: 'success' | 'failed' | 'error';
  error_message: string;
  execution_time: string;
}

export default function ResultsPage() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedResultId, setExpandedResultId] = useState<number | null>(null);
  const [filterServerId, setFilterServerId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [limit, setLimit] = useState(50);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    server_id: '',
    command_id: '',
    output: '',
    status: 'success',
    error_message: '',
    execution_time: '0',
  });

  useEffect(() => {
    fetchServers();
    fetchCommands();
    fetchResults();
  }, [filterServerId, filterStatus, limit]);

  const fetchServers = async () => {
    try {
      const data = await serversApi.getAll();
      setServers(data.servers || []);
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    }
  };

  const fetchCommands = async () => {
    try {
      const data = await commandsApi.getAll();
      setCommands(data.commands || []);
    } catch (error) {
      console.error('Failed to fetch commands:', error);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const data = await checksApi.getResults({
        limit,
        server_id: filterServerId || undefined,
        status: filterStatus || undefined,
      });
      setResults(data.results || []);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      server_id: '',
      command_id: '',
      output: '',
      status: 'success',
      error_message: '',
      execution_time: '0',
    });
    setShowModal(true);
  };

  const handleEdit = async (id: number) => {
    try {
      const { result } = await checksApi.getResult(id);
      setModalMode('edit');
      setEditingId(id);
      setFormData({
        server_id: result.server_id.toString(),
        command_id: result.command_id.toString(),
        output: result.output || '',
        status: result.status,
        error_message: result.error_message || '',
        execution_time: result.execution_time.toString(),
      });
      setShowModal(true);
    } catch (error) {
      console.error('Failed to fetch result:', error);
      alert('결과를 불러오는데 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await checksApi.deleteResult(id);
      alert('삭제되었습니다.');
      fetchResults();
    } catch (error) {
      console.error('Failed to delete result:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (modalMode === 'create') {
        await checksApi.createResult({
          server_id: parseInt(formData.server_id),
          command_id: parseInt(formData.command_id),
          output: formData.output,
          status: formData.status,
          error_message: formData.error_message || undefined,
          execution_time: parseInt(formData.execution_time),
        });
        alert('생성되었습니다.');
      } else {
        if (!editingId) return;
        await checksApi.updateResult(editingId, {
          output: formData.output,
          status: formData.status,
          error_message: formData.error_message || undefined,
          execution_time: parseInt(formData.execution_time),
        });
        alert('수정되었습니다.');
      }

      setShowModal(false);
      fetchResults();
    } catch (error) {
      console.error('Failed to save result:', error);
      alert('저장에 실패했습니다.');
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

  if (loading && results.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">점검 결과 내역</h1>
          <p className="mt-2 text-sm text-gray-600">
            모든 점검 결과를 조회하고 관리할 수 있습니다
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          + 결과 추가
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              표시 개수
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
              <option value={200}>200개</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchResults}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {results.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            점검 결과가 없습니다.
          </div>
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
                    작업
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() =>
                            setExpandedResultId(
                              expandedResultId === result.id ? null : result.id
                            )
                          }
                          className="text-primary-600 hover:text-primary-900"
                        >
                          {expandedResultId === result.id ? '접기' : '상세'}
                        </button>
                        <button
                          onClick={() => handleEdit(result.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(result.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                    {expandedResultId === result.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            {result.output && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  출력:
                                </span>
                                <pre className="mt-1 text-sm text-gray-900 bg-white p-3 rounded border whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                                  {result.output}
                                </pre>
                              </div>
                            )}
                            {result.error_message && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  에러 메시지:
                                </span>
                                <pre className="mt-1 text-sm text-red-900 bg-red-50 p-3 rounded border border-red-200 whitespace-pre-wrap break-words">
                                  {result.error_message}
                                </pre>
                              </div>
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

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {modalMode === 'create' ? '점검 결과 추가' : '점검 결과 수정'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {modalMode === 'create' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        서버 *
                      </label>
                      <select
                        value={formData.server_id}
                        onChange={(e) =>
                          setFormData({ ...formData, server_id: e.target.value })
                        }
                        required
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">선택하세요</option>
                        {servers.map((server) => (
                          <option key={server.id} value={server.id}>
                            {server.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        명령어 *
                      </label>
                      <select
                        value={formData.command_id}
                        onChange={(e) =>
                          setFormData({ ...formData, command_id: e.target.value })
                        }
                        required
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">선택하세요</option>
                        {commands.map((command) => (
                          <option key={command.id} value={command.id}>
                            {command.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상태 *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'success' | 'failed' | 'error',
                      })
                    }
                    required
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="success">성공</option>
                    <option value="failed">실패</option>
                    <option value="error">에러</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    출력
                  </label>
                  <textarea
                    value={formData.output}
                    onChange={(e) =>
                      setFormData({ ...formData, output: e.target.value })
                    }
                    rows={6}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="명령어 출력 결과"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    에러 메시지
                  </label>
                  <textarea
                    value={formData.error_message}
                    onChange={(e) =>
                      setFormData({ ...formData, error_message: e.target.value })
                    }
                    rows={3}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="에러 발생 시 메시지"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    실행 시간 (ms)
                  </label>
                  <input
                    type="number"
                    value={formData.execution_time}
                    onChange={(e) =>
                      setFormData({ ...formData, execution_time: e.target.value })
                    }
                    min="0"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    {modalMode === 'create' ? '추가' : '수정'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
