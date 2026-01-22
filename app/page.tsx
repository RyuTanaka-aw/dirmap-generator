'use client';

import { useState } from 'react';

interface CrawlResult {
  url: string;
  title: string;
  depth: number;
  children: CrawlResult[];
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useAuth, setUseAuth] = useState(false);
  const [maxDepth, setMaxDepth] = useState(2);
  const [excludePatterns, setExcludePatterns] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [error, setError] = useState('');

  const handleCrawl = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/crawl-recursive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          maxDepth,
          username: useAuth ? username : undefined,
          password: useAuth ? password : undefined,
          excludePatterns: excludePatterns.split(',').map(p => p.trim()).filter(Boolean)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'クロールに失敗しました');
      }

      setResult(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!result) {
      alert('クロール結果がありません');
      return;
    }

    try {
      const response = await fetch('/api/generate-excel-from-crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crawlResult: result }),
      });

      if (!response.ok) {
        throw new Error('Excel生成に失敗しました');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'sitemap.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      alert('Excelファイルのダウンロードが完了しました!');
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('Excelのエクスポートに失敗しました');
    }
  };

  // ツリー表示用のコンポーネント
  const TreeNode = ({ node, level = 0 }: { node: CrawlResult; level?: number }) => {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="ml-4">
        <div className="flex items-center py-1">
          {hasChildren && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="mr-2 text-gray-500 hover:text-gray-700"
            >
              {isOpen ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="mr-2 w-4"></span>}
          <div className="flex-1">
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              {node.url}
            </a>
            <span className="ml-2 text-gray-500 text-sm">
              ({node.title})
            </span>
            <span className="ml-2 text-gray-400 text-xs">
              [深度: {node.depth}]
            </span>
          </div>
        </div>
        {isOpen && hasChildren && (
          <div className="border-l-2 border-gray-200 ml-2">
            {node.children.map((child, index) => (
              <TreeNode key={index} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // URL数を再帰的にカウント
  const countUrls = (node: CrawlResult): number => {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += countUrls(child);
      }
    }
    return count;
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50">
      <div className="w-full max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          サイトマップ生成ツール
        </h1>

        {/* 入力フォーム */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">クロール設定</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                対象URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                クロール深度（階層数）
              </label>
              <input
                type="number"
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                min="1"
                max="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ URL構造での深度（推奨: 2-3階層）
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                除外パターン（任意）
              </label>
              <input
                type="text"
                value={excludePatterns}
                onChange={(e) => setExcludePatterns(e.target.value)}
                placeholder="/admin/*, *.pdf, /api/*"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                カンマ区切りで複数指定可能
              </p>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useAuth}
                  onChange={(e) => setUseAuth(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">Basic認証が必要</span>
              </label>
            </div>

            {useAuth && (
              <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-gray-200">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ユーザー名
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleCrawl}
              disabled={loading || !url}
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'クロール中...' : 'クロール開始'}
            </button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>エラー:</strong> {error}
            </div>
          )}
        </div>

        {/* 結果表示 */}
        {result && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">クロール結果</h2>
              <button
                onClick={handleExportToExcel}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Excelでエクスポート
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <p className="mb-2">
                <strong>ルートURL:</strong> {result.url}
              </p>
              <p className="mb-2">
                <strong>ページタイトル:</strong> {result.title}
              </p>
              <p>
                <strong>総URL数:</strong> {countUrls(result)}
              </p>
            </div>

            <div className="border rounded-md p-4 bg-white max-h-[600px] overflow-y-auto">
              <h3 className="font-bold mb-3">ディレクトリ構造（URL階層順）</h3>
              <TreeNode node={result} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
