'use client';

import { useEffect, useState } from 'react';
import { vpnApi } from '@/lib/api';

interface VpnProfile {
  id: number;
  name: string;
  process_name: string;
  description?: string;
  server_count: number;
  created_at: string;
  is_running?: boolean;
}

export default function VpnSettingsPage() {
  const [vpnProfiles, setVpnProfiles] = useState<VpnProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    process_name: '',
    description: '',
  });
  const [checkingProcesses, setCheckingProcesses] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchVpnProfiles();
  }, []);

  // 주기적으로 프로세스 상태 체크 (10초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAllProcesses();
    }, 10000);

    // 초기 체크
    checkAllProcesses();

    return () => clearInterval(interval);
  }, [vpnProfiles]);

  const fetchVpnProfiles = async () => {
    try {
      const data = await vpnApi.getAll();
      setVpnProfiles(data.vpn_profiles || []);
    } catch (error) {
      console.error('Failed to fetch VPN profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAllProcesses = async () => {
    for (const profile of vpnProfiles) {
      await checkProcess(profile.id, profile.process_name);
    }
  };

  const checkProcess = async (profileId: number, processName: string) => {
    try {
      setCheckingProcesses((prev) => new Set(prev).add(profileId));

      const data = await vpnApi.checkProcess(processName);

      setVpnProfiles((prev) =>
        prev.map((profile) =>
          profile.id === profileId
            ? { ...profile, is_running: data.is_running }
            : profile
        )
      );
    } catch (error) {
      console.error('Failed to check process:', error);
    } finally {
      setCheckingProcesses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(profileId);
        return newSet;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await vpnApi.update(editingId, formData);
      } else {
        await vpnApi.create(formData);
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', process_name: '', description: '' });
      fetchVpnProfiles();
    } catch (error: any) {
      console.error('Failed to save VPN profile:', error);
      alert(`실패: ${error.message}`);
    }
  };

  const handleEdit = (profile: VpnProfile) => {
    setEditingId(profile.id);
    setFormData({
      name: profile.name,
      process_name: profile.process_name,
      description: profile.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 VPN 프로필을 삭제하시겠습니까?')) return;

    try {
      await vpnApi.delete(id);
      fetchVpnProfiles();
    } catch (error: any) {
      console.error('Failed to delete VPN profile:', error);
      alert(`VPN 프로필 삭제 실패: ${error.message}`);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', process_name: '', description: '' });
    setShowModal(true);
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
          <h1 className="text-3xl font-bold text-gray-900">VPN 설정</h1>
          <p className="mt-2 text-sm text-gray-600">
            VPN 프로필을 관리하고 프로세스 상태를 모니터링합니다
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          VPN 프로필 추가
        </button>
      </div>

      {vpnProfiles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="mt-2 text-sm font-medium text-gray-900">VPN 프로필 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            새 VPN 프로필을 추가하여 시작하세요.
          </p>
          <div className="mt-6">
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              VPN 프로필 추가
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {vpnProfiles.map((profile) => (
              <li key={profile.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {profile.name}
                        </h3>
                        {profile.is_running !== undefined && (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              profile.is_running
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {checkingProcesses.has(profile.id)
                              ? '확인 중...'
                              : profile.is_running
                              ? '실행 중'
                              : '중지됨'}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 flex-wrap">
                        <span className="flex items-center">
                          <span className="font-semibold mr-2">프로세스:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {profile.process_name}
                          </code>
                        </span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center">
                          <span className="font-semibold mr-2">연결된 서버:</span>
                          {profile.server_count}개
                        </span>
                      </div>
                      {profile.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {profile.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                      <button
                        onClick={() => checkProcess(profile.id, profile.process_name)}
                        disabled={checkingProcesses.has(profile.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        체크
                      </button>
                      <button
                        onClick={() => handleEdit(profile)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(profile.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
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

      {/* VPN 프로필 추가/수정 모달 */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingId ? 'VPN 프로필 수정' : '새 VPN 프로필 추가'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        VPN 이름 *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Company VPN"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        프로세스 이름 *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.process_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            process_name: e.target.value,
                          })
                        }
                        placeholder="openvpn.exe"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Windows: 확장자 포함 (예: openvpn.exe) / Linux/Mac: 확장자 제외
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
                        placeholder="이 VPN에 대한 설명을 입력하세요"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingId ? '수정' : '추가'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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