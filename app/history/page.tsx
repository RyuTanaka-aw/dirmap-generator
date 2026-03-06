'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SitemapMetadata, SitemapsData } from '@/lib/types';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function HistoryPage() {
  const [sitemaps, setSitemaps] = useState<SitemapMetadata[]>([]);
  const [filteredSitemaps, setFilteredSitemaps] = useState<SitemapMetadata[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SitemapMetadata | null>(null);
  const [deleting, setDeleting] = useState(false);

  // メタデータを取得
  useEffect(() => {
    async function fetchSitemaps() {
      try {
        const response = await fetch(`${BASE_PATH}/api/sitemaps`);
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
      const response = await fetch(`${BASE_PATH}/api/download/${fileName}`);
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

  // 削除ハンドラー
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`${BASE_PATH}/api/sitemaps/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '削除に失敗しました');
      }
      setSitemaps((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
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
        <Link href="/" className="text-base font-semibold hover:opacity-80 transition-opacity">ディレクトリマップ生成ツール</Link>
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
              className="bg-white max-w-lg"
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
                            <div className="flex items-center gap-2">
                              <Button size="sm"
                                onClick={() => handleDownload(sitemap.fileName)}>
                                ダウンロード
                              </Button>
                              <Button size="sm" variant="outline"
                                className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/5 bg-white"
                                onClick={() => setDeleteTarget(sitemap)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
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
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1"
                          onClick={() => handleDownload(sitemap.fileName)}>
                          ダウンロード
                        </Button>
                        <Button variant="outline"
                          className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/5 bg-white"
                          onClick={() => setDeleteTarget(sitemap)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-card rounded-lg border shadow-lg max-w-sm w-full p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">履歴を削除しますか？</h2>
            <p className="text-sm text-muted-foreground">
              このExcelファイルと履歴データは完全に削除されます。この操作は取り消せません。
            </p>
            <p className="text-sm font-medium truncate">{deleteTarget.domain}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? '削除中...' : '削除する'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
