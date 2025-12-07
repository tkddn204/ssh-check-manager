'use client';

import { useEffect, useState } from 'react';
import { credentialsApi } from '@/lib/api';

interface Credential {
  id: number;
  name: string;
  username: string;
  auth_type: 'password' | 'key';
  has_password: boolean;
  has_private_key: boolean;
  description?: string;
  server_count: number;
  created_at: string;
  updated_at?: string;
}

interface CredentialDetail {
  id: number;
  name: string;
  username: string;
  auth_type: 'password' | 'key';
  password?: string;
  private_key?: string;
  description?: string;
  servers: Array<{
    id: number;
    name: string;
    host: string;
  }>;
  created_at: string;
  updated_at?: string;
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    auth_type: 'password' as 'password' | 'key',
    password: '',
    private_key: '',
    description: '',
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // View detail modal
  const [viewDetail, setViewDetail] = useState<CredentialDetail | null>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const data = await credentialsApi.getAll();
      setCredentials(data.credentials);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData({
      name: '',
      username: '',
      auth_type: 'password',
      password: '',
      private_key: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (id: number) => {
    try {
      const { credential } = await credentialsApi.get(id);
      setModalMode('edit');
      setEditingId(id);
      setFormData({
        name: credential.name,
        username: credential.username,
        auth_type: credential.auth_type,
        password: credential.password || '',
        private_key: credential.private_key || '',
        description: credential.description || '',
      });
      setIsModalOpen(true);
    } catch (err: any) {
      alert(`Failed to load credential: ${err.message}`);
    }
  };

  const openViewDetail = async (id: number) => {
    try {
      const { credential } = await credentialsApi.get(id);
      setViewDetail(credential);
    } catch (err: any) {
      alert(`Failed to load credential: ${err.message}`);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        name: formData.name,
        username: formData.username,
        auth_type: formData.auth_type,
        password: formData.auth_type === 'password' ? formData.password : undefined,
        private_key: formData.auth_type === 'key' ? formData.private_key : undefined,
        description: formData.description,
      };

      if (modalMode === 'create') {
        await credentialsApi.create(submitData);
      } else {
        await credentialsApi.update(editingId!, submitData);
      }

      await loadCredentials();
      closeModal();
    } catch (err: any) {
      alert(`Failed to ${modalMode === 'create' ? 'create' : 'update'} credential: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await credentialsApi.delete(id);
      await loadCredentials();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(`Failed to delete credential: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">인증 정보 관리</h1>
        <button
          onClick={openCreateModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          새 인증 정보 추가
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                사용자명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                인증 방식
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                서버 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                설명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {credentials.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  등록된 인증 정보가 없습니다.
                </td>
              </tr>
            ) : (
              credentials.map((cred) => (
                <tr key={cred.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {cred.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {cred.username}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        cred.auth_type === 'password'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {cred.auth_type === 'password' ? 'Password' : 'SSH Key'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {cred.server_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cred.description || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => openViewDetail(cred.id)}
                      className="mr-3 text-indigo-600 hover:text-indigo-900"
                    >
                      상세
                    </button>
                    <button
                      onClick={() => openEditModal(cred.id)}
                      className="mr-3 text-blue-600 hover:text-blue-900"
                    >
                      수정
                    </button>
                    {cred.server_count === 0 ? (
                      deleteConfirm === cred.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(cred.id)}
                            className="mr-2 text-red-600 hover:text-red-900"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(cred.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      )
                    ) : (
                      <span className="text-gray-400" title="서버가 사용 중인 인증 정보는 삭제할 수 없습니다">
                        삭제 불가
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <h2 className="mb-4 text-2xl font-bold">
              {modalMode === 'create' ? '새 인증 정보 추가' : '인증 정보 수정'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  사용자명 *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  인증 방식 *
                </label>
                <select
                  value={formData.auth_type}
                  onChange={(e) =>
                    setFormData({ ...formData, auth_type: e.target.value as 'password' | 'key' })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="password">Password</option>
                  <option value="key">SSH Key</option>
                </select>
              </div>

              {formData.auth_type === 'password' && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    비밀번호 *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    required={formData.auth_type === 'password'}
                  />
                </div>
              )}

              {formData.auth_type === 'key' && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Private Key *
                  </label>
                  <textarea
                    value={formData.private_key}
                    onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                    rows={8}
                    required={formData.auth_type === 'key'}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {modalMode === 'create' ? '추가' : '수정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <h2 className="mb-4 text-2xl font-bold">인증 정보 상세</h2>
            <div className="space-y-3">
              <div>
                <span className="font-semibold">이름:</span> {viewDetail.name}
              </div>
              <div>
                <span className="font-semibold">사용자명:</span> {viewDetail.username}
              </div>
              <div>
                <span className="font-semibold">인증 방식:</span>{' '}
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    viewDetail.auth_type === 'password'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {viewDetail.auth_type === 'password' ? 'Password' : 'SSH Key'}
                </span>
              </div>
              {viewDetail.description && (
                <div>
                  <span className="font-semibold">설명:</span> {viewDetail.description}
                </div>
              )}
              <div>
                <span className="font-semibold">사용 중인 서버:</span>
                {viewDetail.servers.length === 0 ? (
                  <span className="ml-2 text-gray-500">없음</span>
                ) : (
                  <ul className="mt-2 list-inside list-disc">
                    {viewDetail.servers.map((server) => (
                      <li key={server.id}>
                        {server.name} ({server.host})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <span className="font-semibold">생성일:</span>{' '}
                {new Date(viewDetail.created_at).toLocaleString('ko-KR')}
              </div>
              {viewDetail.updated_at && (
                <div>
                  <span className="font-semibold">수정일:</span>{' '}
                  {new Date(viewDetail.updated_at).toLocaleString('ko-KR')}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewDetail(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
