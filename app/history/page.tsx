'use client';

import { useEffect, useState } from 'react';
import type { SitemapMetadata, SitemapsData } from '@/lib/types';

export default function HistoryPage() {
  const [sitemaps, setSitemaps] = useState<SitemapMetadata[]>([]);
  const [filteredSitemaps, setFilteredSitemaps] = useState<SitemapMetadata[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // メタデータを取得
  useEffect(() => {
    async function fetchSitemaps() {
      try {
        const response = await fetch('/api/sitemaps');
        if (!response.ok) {
          throw new Error('メタデータの取得に失敗しました');
        }
        const data: SitemapsData = await response.json();
        setSitemaps(data.sitemaps);
        setFilteredSitemaps(data.sitemaps);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }

    fetchSitemaps();
  }, []);

  // キーワード検索（リアルタイム絞り込み）
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredSitemaps(sitemaps);
      return;
    }

    const keyword = searchKeyword.toLowerCase();
    const filtered = sitemaps.filter(
      (sitemap) =>
        sitemap.domain.toLowerCase().includes(keyword) ||
        sitemap.topPageTitle.toLowerCase().includes(keyword)
    );
    setFilteredSitemaps(filtered);
  }, [searchKeyword, sitemaps]);

  // ダウンロードハンドラー
  const handleDownload = async (fileName: string) => {
    try {
      const response = await fetch(`/api/download/${fileName}`);
      if (!response.ok) {
        throw new Error('ファイルのダウンロードに失敗しました');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
    }
  };

  // 日時フォーマット
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <p className="text-red-600 font-bold">エラー</p>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            サイトマップ履歴
          </h1>
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← トップページに戻る
          </a>
        </div>

        {/* 検索ボックス */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="ドメイン名・タイトルで検索..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 検索結果カウント */}
        <div className="mb-4 text-gray-600">
          {filteredSitemaps.length} 件の履歴
          {searchKeyword && ` (「${searchKeyword}」で検索)`}
        </div>

        {/* テーブル */}
        {filteredSitemaps.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-600">
            履歴がありません
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ドメイン
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TOPページタイトル
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ページ数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      開発URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      生成日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSitemaps.map((sitemap) => (
                    <tr key={sitemap.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={sitemap.domain}>
                          {sitemap.domain}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-md truncate" title={sitemap.topPageTitle}>
                          {sitemap.topPageTitle}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sitemap.totalPages}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sitemap.hasDevUrl ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            あり
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            なし
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(sitemap.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDownload(sitemap.fileName)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          ダウンロード
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
