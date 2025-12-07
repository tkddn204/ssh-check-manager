'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface MenuItem {
  name: string;
  href: string;
  icon: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: '대시보드',
    items: [
      { name: '대시보드', href: '/', icon: '📊' },
    ],
  },
  {
    title: '설정',
    items: [
      { name: '서버 관리', href: '/servers', icon: '🖥️' },
      { name: '인증 관리', href: '/credentials', icon: '🔑' },
      { name: 'VPN 설정', href: '/vpn-settings', icon: '🔒' },
      { name: '명령어 관리', href: '/commands', icon: '⚡' },
    ],
  },
  {
    title: '점검',
    items: [
      { name: '점검 실행', href: '/checks', icon: '▶️' },
      { name: '점검 결과', href: '/results', icon: '📝' },
    ],
  },
  {
    title: '보고서',
    items: [
      { name: '서버 상태', href: '/server-status', icon: '💚' },
      { name: '상태 요약', href: '/status-summary', icon: '📋' },
      { name: '리포트', href: '/reports', icon: '📈' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`bg-gray-900 text-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } flex flex-col`}
    >
      {/* Toggle button */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!collapsed && <span className="font-semibold text-sm text-gray-300">메뉴</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-gray-800 transition-colors"
          title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            {!collapsed && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.title}
              </h3>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                      title={collapsed ? item.name : undefined}
                    >
                      <span className="text-lg mr-3">{item.icon}</span>
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        {!collapsed ? (
          <div className="text-xs text-gray-400">
            <p className="font-semibold">SSH Check Manager</p>
            <p className="mt-1">v1.0.0</p>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-400">v1.0</div>
        )}
      </div>
    </aside>
  );
}
