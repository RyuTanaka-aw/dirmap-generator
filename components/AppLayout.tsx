'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64">
        {/* モバイルヘッダー */}
        <div className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="size-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-50 transition-colors"
            aria-label="メニューを開く"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-semibold text-slate-900">ディレクトリマップ生成ツール</span>
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 bg-gray-50 overflow-y-auto">
          <div className="px-6 py-8 md:px-8 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
