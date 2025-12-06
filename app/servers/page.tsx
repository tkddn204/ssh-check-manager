'use client';

import { useEffect, useState } from 'react';
import { serversApi, vpnApi } from '@/lib/api';

interface VpnProfile {
  id: number;
  name: string;
  process_name: string;
}

interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  description?: string;
  createdAt: string;
  vpnProfileId?: number;
  vpnProfile?: VpnProfile;
  requiresClient?: boolean;
  clientType?: 'vpn' | 'web_portal' | 'custom_app' | 'bastion' | 'none';
  clientConfig?: string;
}

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [vpnProfiles, setVpnProfiles] = useState<VpnProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'password' as 'password' | 'key',
    password: '',
    privateKey: '',
    description: '',
    vpnProfileId: null as number | null,
    requiresClient: false,
    clientType: 'none' as 'vpn' | 'web_portal' | 'custom_app' | 'bastion' | 'none',
    // VPN 설정 (deprecated - VPN 프로필로 대체)
    vpnName: '',
    vpnExecutablePath: '',
    vpnConfigPath: '',
    // 웹 포털 설정
    webPortalUrl: '',
    webPortalInstructions: '',
    // 커스텀 앱 설정
    customAppPath: '',
    customAppArgs: '',
    // Bastion 설정
    bastionHost: '',
    bastionPort: 22,
    bastionUsername: '',
    bastionAuthType: 'password' as 'password' | 'key',
    bastionPassword: '',
    bastionPrivateKey: '',
  });

  useEffect(() => {
    fetchServers();
    fetchVpnProfiles();
  }, []);

  const fetchServers = async () => {
    try {
      const data = await serversApi.getAll();
      setServers(data.servers || []);
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVpnProfiles = async () => {
    try {
      const data = await vpnApi.getAll();
      setVpnProfiles(data.vpn_profiles || []);
    } catch (error) {
      console.error('Failed to fetch VPN profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // clientConfig JSON 생성
      let clientConfig = null;
      if (formData.requiresClient && formData.clientType !== 'none') {
        switch (formData.clientType) {
          case 'vpn':
            clientConfig = JSON.stringify({
              vpnName: formData.vpnName,
              vpnExecutablePath: formData.vpnExecutablePath,
              vpnConfigPath: formData.vpnConfigPath,
            });
            break;
          case 'web_portal':
            clientConfig = JSON.stringify({
              webPortalUrl: formData.webPortalUrl,
              webPortalInstructions: formData.webPortalInstructions,
            });
            break;
          case 'custom_app':
            clientConfig = JSON.stringify({
              customAppPath: formData.customAppPath,
              customAppArgs: formData.customAppArgs,
            });
            break;
          case 'bastion':
            clientConfig = JSON.stringify({
              bastionHost: formData.bastionHost,
              bastionPort: formData.bastionPort,
              bastionUsername: formData.bastionUsername,
              bastionAuthType: formData.bastionAuthType,
              bastionPassword: formData.bastionAuthType === 'password' ? formData.bastionPassword : null,
              bastionPrivateKey: formData.bastionAuthType === 'key' ? formData.bastionPrivateKey : null,
            });
            break;
        }
      }

      await serversApi.create({
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        authType: formData.authType,
        password: formData.password,
        privateKey: formData.privateKey,
        description: formData.description,
        requiresClient: formData.requiresClient,
        clientType: formData.requiresClient ? formData.clientType : null,
        clientConfig,
      });

      setShowModal(false);
      setFormData({
        name: '',
        host: '',
        port: 22,
        username: '',
        authType: 'password',
        password: '',
        privateKey: '',
        description: '',
        requiresClient: false,
        clientType: 'none',
        vpnProfileId: null,
        vpnName: '',
        vpnExecutablePath: '',
        vpnConfigPath: '',
        webPortalUrl: '',
        webPortalInstructions: '',
        customAppPath: '',
        customAppArgs: '',
        bastionHost: '',
        bastionPort: 22,
        bastionUsername: '',
        bastionAuthType: 'password',
        bastionPassword: '',
        bastionPrivateKey: '',
      });
      fetchServers();
    } catch (error: any) {
      console.error('Failed to add server:', error);
      alert(`서버 추가 실패: ${error.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 서버를 삭제하시겠습니까?')) return;

    try {
      await serversApi.delete(id);
      fetchServers();
    } catch (error: any) {
      console.error('Failed to delete server:', error);
      alert(`서버 삭제 실패: ${error.message}`);
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
          <h1 className="text-3xl font-bold text-gray-900">서버 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            SSH로 접속할 서버를 관리합니다
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          서버 추가
        </button>
      </div>

      {servers.length === 0 ? (
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
              d="M5 12h14M12 5l7 7-7 7"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">서버 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            새 서버를 추가하여 시작하세요.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              서버 추가
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {servers.map((server) => (
              <li key={server.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {server.name}
                      </h3>
                      <div className="mt-2 flex items-center text-sm text-gray-500 flex-wrap">
                        <span className="flex items-center">
                          <span className="font-semibold mr-2">호스트:</span>
                          {server.host}:{server.port}
                        </span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center">
                          <span className="font-semibold mr-2">사용자:</span>
                          {server.username}
                        </span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center">
                          <span className="font-semibold mr-2">인증:</span>
                          {server.authType === 'password' ? '비밀번호' : 'SSH 키'}
                        </span>
                        {server.requiresClient && server.clientType && server.clientType !== 'none' && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="flex items-center">
                              <span className="font-semibold mr-2">클라이언트:</span>
                              {server.clientType === 'vpn' && 'VPN'}
                              {server.clientType === 'web_portal' && '웹 포털'}
                              {server.clientType === 'custom_app' && '커스텀 앱'}
                              {server.clientType === 'bastion' && 'Bastion 호스트'}
                            </span>
                          </>
                        )}
                      </div>
                      {server.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {server.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleDelete(server.id)}
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

      {/* 서버 추가 모달 */}
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
                    새 서버 추가
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        서버 이름 *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          호스트 *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.host}
                          onChange={(e) =>
                            setFormData({ ...formData, host: e.target.value })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          포트
                        </label>
                        <input
                          type="number"
                          value={formData.port}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              port: parseInt(e.target.value),
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        사용자 이름 *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          인증 방식
                        </label>
                        <select
                          value={formData.authType}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              authType: e.target.value as 'password' | 'key',
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="password">비밀번호</option>
                          <option value="key">SSH 키</option>
                        </select>
                      </div>

                    </div>

                    {formData.authType === 'password' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          비밀번호 *
                        </label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          SSH 개인 키 *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={formData.privateKey}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              privateKey: e.target.value,
                            })
                          }
                          placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    )}

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
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    {/* 클라이언트 요구사항 */}
                    <div className="border-t pt-4">
                      <div className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          id="requiresClient"
                          checked={formData.requiresClient}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              requiresClient: e.target.checked,
                              clientType: e.target.checked ? formData.clientType : 'none',
                            })
                          }
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor="requiresClient"
                          className="ml-2 block text-sm font-medium text-gray-700"
                        >
                          접속 전 특별한 클라이언트 필요 (VPN, 웹 포털 등)
                        </label>
                      </div>

                      {formData.requiresClient && (
                        <>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                              클라이언트 유형
                            </label>
                            <select
                              value={formData.clientType}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  clientType: e.target.value as any,
                                })
                              }
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="none">없음</option>
                              <option value="vpn">VPN 클라이언트</option>
                              <option value="web_portal">웹 포털</option>
                              <option value="custom_app">커스텀 애플리케이션</option>
                              <option value="bastion">Bastion 호스트</option>
                            </select>
                          </div>

                          {/* VPN 설정 */}
                          {formData.clientType === 'vpn' && (
                            <div className="space-y-3 bg-gray-50 p-3 rounded">
                              <div>
                                <label className="block text-xs font-medium text-gray-700">
                                  VPN 이름
                                </label>
                                <input
                                  type="text"
                                  value={formData.vpnName}
                                  onChange={(e) =>
                                    setFormData({ ...formData, vpnName: e.target.value })
                                  }
                                  placeholder="Company VPN"
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">
                                  VPN 실행 파일 경로
                                </label>
                                <input
                                  type="text"
                                  value={formData.vpnExecutablePath}
                                  onChange={(e) =>
                                    setFormData({ ...formData, vpnExecutablePath: e.target.value })
                                  }
                                  placeholder="C:\Program Files\OpenVPN\bin\openvpn-gui.exe"
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">
                                  VPN 설정 파일 경로
                                </label>
                                <input
                                  type="text"
                                  value={formData.vpnConfigPath}
                                  onChange={(e) =>
                                    setFormData({ ...formData, vpnConfigPath: e.target.value })
                                  }
                                  placeholder="C:\Users\user\company.ovpn"
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                            </div>
                          )}

                          {/* 웹 포털 설정 */}
                          {formData.clientType === 'web_portal' && (
                            <div className="space-y-3 bg-gray-50 p-3 rounded">
                              <div>
                                <label className="block text-xs font-medium text-gray-700">
                                  웹 포털 URL
                                </label>
                                <input
                                  type="url"
                                  value={formData.webPortalUrl}
                                  onChange={(e) =>
                                    setFormData({ ...formData, webPortalUrl: e.target.value })
                                  }
                                  placeholder="https://portal.company.com"
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">
                                  안내 사항
                                </label>
                                <textarea
                                  rows={2}
                                  value={formData.webPortalInstructions}
                                  onChange={(e) =>
                                    setFormData({ ...formData, webPortalInstructions: e.target.value })
                                  }
                                  placeholder="로그인 후 'SSH 접속' 메뉴에서 세션을 활성화하세요"
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                            </div>
                          )}

                          {/* 커스텀 앱 설정 */}
                          {formData.clientType === 'custom_app' && (
                            <div className="space-y-3 bg-gray-50 p-3 rounded">
                              <div>
                                <label className="block text-xs font-medium text-gray-700">
                                  애플리케이션 경로
                                </label>
                                <input
                                  type="text"
                                  value={formData.customAppPath}
                                  onChange={(e) =>
                                    setFormData({ ...formData, customAppPath: e.target.value })
                                  }
                                  placeholder="C:\Program Files\CustomApp\app.exe"
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">
                                  실행 인자 (선택)
                                </label>
                                <input
                                  type="text"
                                  value={formData.customAppArgs}
                                  onChange={(e) =>
                                    setFormData({ ...formData, customAppArgs: e.target.value })
                                  }
                                  placeholder="--connect --profile=production"
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                            </div>
                          )}

                          {/* Bastion 호스트 설정 */}
                          {formData.clientType === 'bastion' && (
                            <div className="space-y-3 bg-gray-50 p-3 rounded">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700">
                                    Bastion 호스트
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.bastionHost}
                                    onChange={(e) =>
                                      setFormData({ ...formData, bastionHost: e.target.value })
                                    }
                                    placeholder="bastion.company.com"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700">
                                    포트
                                  </label>
                                  <input
                                    type="number"
                                    value={formData.bastionPort}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        bastionPort: parseInt(e.target.value),
                                      })
                                    }
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">
                                  사용자 이름
                                </label>
                                <input
                                  type="text"
                                  value={formData.bastionUsername}
                                  onChange={(e) =>
                                    setFormData({ ...formData, bastionUsername: e.target.value })
                                  }
                                  placeholder="jumpuser"
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">
                                  인증 방식
                                </label>
                                <select
                                  value={formData.bastionAuthType}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      bastionAuthType: e.target.value as 'password' | 'key',
                                    })
                                  }
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                >
                                  <option value="password">비밀번호</option>
                                  <option value="key">SSH 키</option>
                                </select>
                              </div>
                              {formData.bastionAuthType === 'password' ? (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700">
                                    비밀번호
                                  </label>
                                  <input
                                    type="password"
                                    value={formData.bastionPassword}
                                    onChange={(e) =>
                                      setFormData({ ...formData, bastionPassword: e.target.value })
                                    }
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700">
                                    SSH 개인 키
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={formData.bastionPrivateKey}
                                    onChange={(e) =>
                                      setFormData({ ...formData, bastionPrivateKey: e.target.value })
                                    }
                                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;..."
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
