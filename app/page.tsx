'use client';

import { useState } from 'react';

interface CrawlResult {
  url: string;
  title: string;
  description: string;
  depth: number;
  children: CrawlResult[];
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [devDomain, setDevDomain] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useAuth, setUseAuth] = useState(false);
  const [excludePatterns, setExcludePatterns] = useState('');
  const [includeDirectoryColumns, setIncludeDirectoryColumns] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [completedAt, setCompletedAt] = useState<string>('');
  const [savedFileName, setSavedFileName] = useState<string>('');
  const [error, setError] = useState('');

  const handleCrawl = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setCompletedAt('');
    setSavedFileName('');

    try {
      const response = await fetch('/api/crawl-recursive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          username: useAuth ? username : undefined,
          password: useAuth ? password : undefined,
          excludePatterns: excludePatterns.split(',').map(p => p.trim()).filter(Boolean),
          includeDirectoryColumns,
          devDomain: devDomain || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'クロールに失敗しました');
      }

      setResult(data.result);
      setCompletedAt(data.completedAt);

      if (data.savedFileName) {
        console.log('サーバーに自動保存されました:', data.savedFileName);
        setSavedFileName(data.savedFileName);
      }
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

    if (!savedFileName) {
      alert('保存されたファイルが見つかりません');
      return;
    }

    try {
      // 既存の保存済みファイルをダウンロード
      const response = await fetch(`/api/download/${savedFileName}`);

      if (!response.ok) {
        throw new Error('ファイルのダウンロードに失敗しました');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = savedFileName; // 正しいファイル名を使用
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      alert('Excelファイルのダウンロードが完了しました!');
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      alert('Excelのダウンロードに失敗しました');
    }
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
        <h1 className="text-4xl font-bold mb-4 text-center">
          サイトマップ生成ツール
        </h1>
        <div className="text-center mb-6">
          <a
            href="/history"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            履歴一覧を見る
          </a>
        </div>

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
                開発環境URL（任意）
              </label>
              <input
                type="text"
                value={devDomain}
                onChange={(e) => setDevDomain(e.target.value)}
                placeholder="https://dev.example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                本番URLと同じパス構造で開発環境URLを生成します
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

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeDirectoryColumns}
                  onChange={(e) => setIncludeDirectoryColumns(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">ディレクトリパス列を追加</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                各ページのURLパスセグメント名をディレクトリ列に表示します
              </p>
            </div>

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
          <div className="bg-white shadow-md rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">クロールが完了しました</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-700 mb-4">基本情報</h3>
              <div className="space-y-3">
                <div className="flex">
                  <span className="text-gray-600 w-32">ルートURL:</span>
                  <span className="text-gray-800 font-medium flex-1 break-all">{result.url}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-32">総URL数:</span>
                  <span className="text-gray-800 font-medium">{countUrls(result)}</span>
                </div>
                {completedAt && (
                  <div className="flex">
                    <span className="text-gray-600 w-32">完了時刻:</span>
                    <span className="text-gray-800 font-medium">{completedAt}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleExportToExcel}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors shadow-md hover:shadow-lg"
              >
                Excelファイルをダウンロード
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
