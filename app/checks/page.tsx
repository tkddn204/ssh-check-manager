'use client';

import { useEffect, useState, useRef } from 'react';
import { serversApi, commandsApi, checksApi } from '@/lib/api';

interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
}

interface Command {
  id: number;
  name: string;
  command: string;
  description: string;
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

export default function ChecksPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [selectedServers, setSelectedServers] = useState<number[]>([]);
  const [selectedCommands, setSelectedCommands] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [expandedResultId, setExpandedResultId] = useState<number | null>(null);

  // Console output states
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [currentServer, setCurrentServer] = useState<string>('');
  const [currentCommand, setCurrentCommand] = useState<string>('');
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    fetchResults();
  }, []);

  // Auto-scroll console to bottom when new output arrives
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleOutput]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [serversData, commandsData] = await Promise.all([
        serversApi.getAll(),
        commandsApi.getAll(),
      ]);

      setServers(serversData.servers || []);
      setCommands(commandsData.commands || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const data = await checksApi.getResults({ limit: 10 });
      setResults(data.results || []);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const handleServerToggle = (serverId: number) => {
    setSelectedServers((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId]
    );
  };

  const handleCommandToggle = (commandId: number) => {
    setSelectedCommands((prev) =>
      prev.includes(commandId)
        ? prev.filter((id) => id !== commandId)
        : [...prev, commandId]
    );
  };

  const handleSelectAllServers = () => {
    if (selectedServers.length === servers.length) {
      setSelectedServers([]);
    } else {
      setSelectedServers(servers.map((s) => s.id));
    }
  };

  const handleSelectAllCommands = () => {
    if (selectedCommands.length === commands.length) {
      setSelectedCommands([]);
    } else {
      setSelectedCommands(commands.map((c) => c.id));
    }
  };

  const handleExecute = async () => {
    if (selectedServers.length === 0 || selectedCommands.length === 0) {
      alert('서버와 명령어를 최소 하나씩 선택해주세요.');
      return;
    }

    setExecuting(true);
    setConsoleOpen(true);
    setConsoleOutput([]);
    setCurrentServer('');
    setCurrentCommand('');

    try {
      const res = await checksApi.executeBatchStream({
        server_ids: selectedServers,
        command_ids: selectedCommands,
      });

      if (!res.ok) {
        alert('점검 실행 실패');
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        alert('스트림을 읽을 수 없습니다.');
        return;
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)\ndata: (.+)$/);
          if (!eventMatch) continue;

          const [, event, dataStr] = eventMatch;
          const data = JSON.parse(dataStr);

          switch (event) {
            case 'start':
              setProgress({ current: 0, total: data.total_tasks || data.total_servers * data.total_commands, percent: 0 });
              setConsoleOutput((prev) => [...prev, `📋 점검 시작: ${data.total_servers}개 서버, ${data.total_commands}개 명령어 (총 ${data.total_tasks}개 작업)`]);
              break;

            case 'server_start':
              setCurrentServer(`${data.server_name} (${data.server_host})`);
              setConsoleOutput((prev) => [...prev, `\n🖥️  서버: ${data.server_name} (${data.server_host}) [${data.server_index}/${data.total_servers}]`]);
              break;

            case 'command_start':
              setCurrentCommand(data.command_name);
              setConsoleOutput((prev) => [...prev, `\n⚡ 명령어: ${data.command_name} [${data.command_index}/${data.total_commands}]`, `$ ${data.command_text}`]);
              break;

            case 'output':
              const prefix = data.type === 'stderr' ? '⚠️ ' : '';
              setConsoleOutput((prev) => [...prev, prefix + data.data]);
              break;

            case 'command_complete':
              const statusIcon = data.status === 'success' ? '✅' : data.status === 'error' ? '❌' : '⚠️';
              setConsoleOutput((prev) => [...prev, `${statusIcon} 완료: ${data.command_name} (${data.execution_time}ms) - ${data.status}`]);
              setProgress({
                current: data.completed_tasks,
                total: data.total_tasks,
                percent: data.progress
              });
              break;

            case 'server_complete':
              setConsoleOutput((prev) => [...prev, `✓ 서버 완료: ${data.server_name}\n`]);
              break;

            case 'complete':
              setConsoleOutput((prev) => [...prev, `\n🎉 모든 점검 완료! (총 ${data.completed_tasks}/${data.total_tasks} 작업)`]);
              setProgress({
                current: data.completed_tasks,
                total: data.total_tasks,
                percent: 100
              });
              setCurrentServer('');
              setCurrentCommand('');
              fetchResults();
              break;

            case 'error':
              setConsoleOutput((prev) => [...prev, `❌ 에러: ${data.message}${data.details ? ` - ${data.details}` : ''}`]);
              break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to execute checks:', error);
      setConsoleOutput((prev) => [...prev, `\n❌ 점검 실행 중 오류 발생: ${error}`]);
    } finally {
      setExecuting(false);
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
        <h1 className="text-3xl font-bold text-gray-900">점검 실행</h1>
        <p className="mt-2 text-sm text-gray-600">
          서버에 대한 점검 명령어를 실행합니다
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 서버 선택 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              서버 선택 ({selectedServers.length}/{servers.length})
            </h2>
            {servers.length > 0 && (
              <button
                onClick={handleSelectAllServers}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {selectedServers.length === servers.length ? '전체 해제' : '모두 선택'}
              </button>
            )}
          </div>
          {servers.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 서버가 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {servers.map((server) => (
                <div key={server.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`server-${server.id}`}
                    checked={selectedServers.includes(server.id)}
                    onChange={() => handleServerToggle(server.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`server-${server.id}`}
                    className="ml-3 block text-sm text-gray-700"
                  >
                    <span className="font-medium">{server.name}</span>
                    <span className="text-gray-500"> ({server.username}@{server.host}:{server.port})</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 명령어 선택 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              명령어 선택 ({selectedCommands.length}/{commands.length})
            </h2>
            {commands.length > 0 && (
              <button
                onClick={handleSelectAllCommands}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {selectedCommands.length === commands.length ? '전체 해제' : '모두 선택'}
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {commands.map((command) => (
              <div key={command.id} className="flex items-start">
                <input
                  type="checkbox"
                  id={`command-${command.id}`}
                  checked={selectedCommands.includes(command.id)}
                  onChange={() => handleCommandToggle(command.id)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                />
                <label
                  htmlFor={`command-${command.id}`}
                  className="ml-3 block text-sm"
                >
                  <span className="font-medium text-gray-700">
                    {command.name}
                  </span>
                  <p className="text-gray-500 text-xs mt-1">
                    {command.description}
                  </p>
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                    {command.command}
                  </code>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 실행 버튼 */}
      <div className="flex justify-center">
        <button
          onClick={handleExecute}
          disabled={executing || selectedServers.length === 0 || selectedCommands.length === 0}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {executing ? '실행 중...' : '점검 실행'}
        </button>
      </div>

      {/* 실행 콘솔 */}
      {consoleOpen && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 bg-gray-800 text-white">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-medium">실행 콘솔</h2>
              {executing && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>실행 중...</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setConsoleOpen(false)}
              className="text-gray-300 hover:text-white"
            >
              닫기
            </button>
          </div>

          {/* Progress bar */}
          {progress.total > 0 && (
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>진행률: {progress.current} / {progress.total} 작업</span>
                <span className="text-lg font-bold text-primary-600">{progress.percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out shadow-md"
                  style={{ width: `${progress.percent}%` }}
                >
                  {progress.percent > 10 && (
                    <div className="h-full flex items-center justify-end pr-2">
                      <span className="text-xs font-bold text-white drop-shadow">{progress.percent}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current status */}
          {(currentServer || currentCommand) && (
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <div className="space-y-2">
                {currentServer && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">현재 서버</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{currentServer}</span>
                  </div>
                )}
                {currentCommand && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">현재 명령어</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{currentCommand}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Console output */}
          <div className="p-6 bg-black text-green-400 font-mono text-sm max-h-96 overflow-y-auto">
            {consoleOutput.length === 0 ? (
              <div className="text-gray-500">콘솔 출력 대기 중...</div>
            ) : (
              <div className="space-y-0.5">
                {consoleOutput.map((line, index) => (
                  <div key={index} className="whitespace-pre-wrap break-words">
                    {line}
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 최근 점검 결과 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">최근 점검 결과</h2>
          <button
            onClick={fetchResults}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            새로고침
          </button>
        </div>

        {results.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            아직 점검 결과가 없습니다.
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
                                <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-96">
                                  {result.output}
                                </pre>
                              </div>
                            )}
                            {result.error_message && (
                              <div>
                                <h4 className="text-sm font-medium text-red-900 mb-2">
                                  에러 메시지:
                                </h4>
                                <pre className="bg-red-50 p-3 rounded border border-red-200 text-xs text-red-900 overflow-x-auto whitespace-pre-wrap break-words max-h-96">
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
