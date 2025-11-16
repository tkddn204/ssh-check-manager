'use client';

import { useEffect, useState } from 'react';

interface Command {
  id: number;
  name: string;
  command: string;
  description?: string;
  createdAt: string;
}

export default function CommandsPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    command: '',
    description: '',
  });
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchCommands();
  }, []);

  const fetchCommands = async () => {
    try {
      const res = await fetch('/api/commands');
      const data = await res.json();
      setCommands(data.commands || []);
    } catch (error) {
      console.error('Failed to fetch commands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCommand
        ? `/api/commands/${editingCommand.id}`
        : '/api/commands';
      const method = editingCommand ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingCommand(null);
        setFormData({
          name: '',
          command: '',
          description: '',
        });
        fetchCommands();
      } else {
        const error = await res.json();
        alert(`명령어 ${editingCommand ? '수정' : '추가'} 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save command:', error);
      alert('명령어 저장 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (command: Command) => {
    setEditingCommand(command);
    setFormData({
      name: command.name,
      command: command.command,
      description: command.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 명령어를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/commands/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCommands();
      } else {
        alert('명령어 삭제 실패');
      }
    } catch (error) {
      console.error('Failed to delete command:', error);
    }
  };

  const handleAddNew = () => {
    setEditingCommand(null);
    setFormData({
      name: '',
      command: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleInitialize = async () => {
    if (!confirm('기본 명령어 7개를 추가하시겠습니까?')) return;

    setInitializing(true);
    try {
      const res = await fetch('/api/init', {
        method: 'POST',
      });

      if (res.ok) {
        alert('기본 명령어가 추가되었습니다.');
        fetchCommands();
      } else {
        const error = await res.json();
        alert(`초기화 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      alert('초기화 중 오류가 발생했습니다.');
    } finally {
      setInitializing(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">명령어 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            서버 점검에 사용할 명령어를 관리합니다
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          명령어 추가
        </button>
      </div>

      {commands.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">명령어 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            기본 명령어를 추가하거나 새 명령어를 직접 만드세요.
          </p>
          <div className="mt-6 flex justify-center space-x-3">
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {initializing ? '추가 중...' : '기본 명령어 추가'}
            </button>
            <button
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              직접 추가
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {commands.map((command) => (
              <li key={command.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {command.name}
                      </h3>
                      <div className="mt-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                          {command.command}
                        </code>
                      </div>
                      {command.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {command.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => handleEdit(command)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(command.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 명령어 추가/수정 모달 */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowModal(false);
                setEditingCommand(null);
              }}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingCommand ? '명령어 수정' : '새 명령어 추가'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        명령어 이름 *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="예: Disk Usage"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        명령어 *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={formData.command}
                        onChange={(e) =>
                          setFormData({ ...formData, command: e.target.value })
                        }
                        placeholder="예: df -h"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        SSH를 통해 실행할 셸 명령어를 입력하세요
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        설명
                      </label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="예: 디스크 사용량 확인"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingCommand ? '수정' : '추가'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCommand(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    취소
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
