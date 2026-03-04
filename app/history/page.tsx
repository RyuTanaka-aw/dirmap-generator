'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* Header */}
      <header className="h-16 bg-card border-b flex items-center justify-between px-8 shrink-0">
        <span className="text-base font-semibold">ディレクトリマップ生成ツール</span>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> ツールに戻る
        </Link>
      </header>

      <main className="flex-1 p-4 md:p-8 flex flex-col gap-6">

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <>
            {/* Title row */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold md:font-semibold">ディレクトリマップ履歴</h1>
              <span className="hidden md:inline text-sm text-primary font-semibold">{filteredSitemaps.length}件</span>
              <Badge className="md:hidden">{filteredSitemaps.length}件</Badge>
            </div>

            {/* Search */}
            <Input placeholder="ドメイン・タイトルで検索..."
              value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />

            {filteredSitemaps.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">履歴がありません</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[220px]">ドメイン</TableHead>
                        <TableHead>TOPページタイトル</TableHead>
                        <TableHead className="w-[100px]">ページ数</TableHead>
                        <TableHead className="w-[100px]">開発URL</TableHead>
                        <TableHead className="w-[160px]">生成日時</TableHead>
                        <TableHead className="w-[150px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSitemaps.map((sitemap) => (
                        <TableRow key={sitemap.id}>
                          <TableCell className="font-medium">{sitemap.domain}</TableCell>
                          <TableCell className="max-w-0">
                            <span className="block truncate">{sitemap.topPageTitle}</span>
                          </TableCell>
                          <TableCell>{sitemap.totalPages}</TableCell>
                          <TableCell>
                            {sitemap.hasDevUrl
                              ? <Badge>あり</Badge>
                              : <Badge variant="secondary">なし</Badge>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(sitemap.createdAt)}</TableCell>
                          <TableCell>
                            <Button size="sm"
                              onClick={() => handleDownload(sitemap.fileName)}>
                              ダウンロード
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
                    全{filteredSitemaps.length}件表示中
                  </div>
                </div>

                {/* Mobile Card List */}
                <div className="flex md:hidden flex-col gap-3">
                  {filteredSitemaps.map((sitemap) => (
                    <div key={sitemap.id}
                      className="rounded-lg border border-[#2563EB] bg-card p-4 flex flex-col gap-3">
                      <p className="text-sm font-semibold">{sitemap.domain}</p>
                      <p className="text-xs text-muted-foreground truncate">{sitemap.topPageTitle}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{sitemap.totalPages}ページ</Badge>
                        {sitemap.hasDevUrl
                          ? <Badge>開発URLあり</Badge>
                          : <Badge variant="secondary">開発URLなし</Badge>}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDate(sitemap.createdAt)}
                        </span>
                      </div>
                      <Button variant="outline" className="w-full"
                        onClick={() => handleDownload(sitemap.fileName)}>
                        ダウンロード
                      </Button>
                    </div>
                  ))}
                  <p className="text-center text-sm text-muted-foreground">
                    全{filteredSitemaps.length}件表示中
                  </p>
                </div>
              </>
            )}
          </>
        )}

      </main>
    </div>
  );
}
