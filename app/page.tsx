'use client';

import { useState } from 'react';
import Link from 'next/link';
import { History, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CrawlResult {
  url: string;
  title: string;
  description: string;
  depth: number;
  children: CrawlResult[];
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

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

  const handleCrawl = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setCompletedAt('');
    setSavedFileName('');

    try {
      const response = await fetch(`${BASE_PATH}/api/crawl-recursive`, {
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
      const response = await fetch(`${BASE_PATH}/api/download/${savedFileName}`);

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
    <div className="flex min-h-screen flex-col bg-background">

      {/* Header */}
      <header className="h-16 bg-card border-b flex items-center justify-between px-8 shrink-0">
        <span className="text-base font-semibold">ディレクトリマップ生成ツール</span>
        <Link href="/history" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <History className="w-4 h-4" /> 履歴
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center py-12 px-4 md:px-8">
        <div className="w-full max-w-[640px] flex flex-col gap-6">

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>クロール設定</CardTitle>
              <CardDescription>
                <span className="hidden md:inline">対象のURLを入力してクロールを開始します</span>
                <span className="md:hidden">クロールするWebサイトの設定を入力してください</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="url">対象URL</Label>
                <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="devDomain">開発環境URL（任意）</Label>
                <Input id="devDomain" value={devDomain} onChange={(e) => setDevDomain(e.target.value)}
                  placeholder="http://localhost:3000" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="excludePatterns">除外パターン（任意）</Label>
                <Input id="excludePatterns" value={excludePatterns}
                  onChange={(e) => setExcludePatterns(e.target.value)}
                  placeholder="/admin/, /api/" />
              </div>

              {/* Basic認証チェックボックス */}
              <div className="flex items-center gap-2">
                <Checkbox id="useAuth" checked={useAuth} onCheckedChange={(c) => setUseAuth(!!c)} />
                <Label htmlFor="useAuth" className="font-medium cursor-pointer">
                  <span className="hidden md:inline">Basic認証が必要</span>
                  <span className="md:hidden">Basic認証を使用する</span>
                </Label>
              </div>

              {/* 認証フィールド（条件付き表示） */}
              {useAuth && (
                <div className="flex flex-col md:flex-row gap-4 pl-6 border-l-2 border-border">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Label htmlFor="username">ユーザー名</Label>
                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="username" />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Label htmlFor="password">パスワード</Label>
                    <Input id="password" type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="password" />
                  </div>
                </div>
              )}

              {/* ディレクトリパスチェックボックス */}
              <div className="flex items-center gap-2">
                <Checkbox id="includeDir" checked={includeDirectoryColumns}
                  onCheckedChange={(c) => setIncludeDirectoryColumns(!!c)} />
                <Label htmlFor="includeDir" className="font-medium cursor-pointer">
                  <span className="hidden md:inline">ディレクトリパス列を追加</span>
                  <span className="md:hidden">ディレクトリパスを含める</span>
                </Label>
              </div>

            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleCrawl} disabled={loading || !url}>
                {loading ? 'クロール中...' : 'クロール開始'}
              </Button>
            </CardFooter>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result Card */}
          {result && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CircleCheck className="w-5 h-5 text-primary" />
                  <CardTitle>クロールが完了しました</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ルートURL</span>
                  <span className="font-medium break-all text-right max-w-[60%]">{result.url}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    <span className="hidden md:inline">総URL数</span>
                    <span className="md:hidden">URLページ数</span>
                  </span>
                  <span className="font-medium text-primary">{countUrls(result)}ページ</span>
                </div>
                {completedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">完了時刻</span>
                    <span className="font-medium">{formatDate(completedAt)}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleExportToExcel}>
                  Excelファイルをダウンロード
                </Button>
              </CardFooter>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
