'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, History, BookOpen, MessageSquareText, X } from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { href: '/', label: 'クロール設定', icon: Map },
  { href: '/history', label: '履歴', icon: History },
  { href: '/docs', label: '使い方', icon: BookOpen },
  { href: '/feedback', label: 'ご意見箱', icon: MessageSquareText },
];

function NavList({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <nav aria-label="メインナビゲーション" className="flex flex-col gap-1 px-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === '/'
            ? pathname === '/' || pathname === basePath + '/'
            : pathname.startsWith(basePath + href) || pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            onClick={onItemClick}
            className={
              isActive
                ? 'flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg'
                : 'flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-body hover:bg-gray-50 rounded-lg transition-colors'
            }
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  // Escapeキーでドロワーを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        onMobileClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* デスクトップ固定サイドバー */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-shrink-0 flex-col h-screen fixed left-0 top-0">
        {/* ブランディングゾーン */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
          <Link href="/" className="text-sm font-semibold text-slate-900 hover:text-primary-500 transition-colors">
            ディレクトリマップ生成ツール
          </Link>
        </div>

        {/* ナビゲーションゾーン */}
        <div className="flex-1 overflow-y-auto py-4">
          <NavList />
        </div>
      </aside>

      {/* モバイルドロワー */}
      {mobileOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* ドロワー本体 */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="ナビゲーション"
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl flex flex-col lg:hidden"
          >
            {/* ヘッダー */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
              <span className="text-sm font-semibold text-slate-900">ディレクトリマップ生成ツール</span>
              <button
                onClick={onMobileClose}
                className="size-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-50 transition-colors"
                aria-label="閉じる"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* ナビゲーション */}
            <div className="flex-1 overflow-y-auto py-4">
              <NavList onItemClick={onMobileClose} />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
