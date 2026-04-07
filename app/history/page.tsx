'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
      } catch {
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    fetchSitemaps();
  }, []);

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
    } catch {
      alert('ダウンロードに失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`${BASE_PATH}/api/sitemaps/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }
      setSitemaps((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert('削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

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
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ディレクトリマップ履歴</h1>
          <p className="text-sm text-slate-500 mt-1">過去に生成したディレクトリマップの一覧</p>
        </div>
        <Badge variant="secondary" className="mt-1 shrink-0">
          {filteredSitemaps.length}件
        </Badge>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-sm text-slate-500">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <>
          <Input
            placeholder="ドメイン・タイトルで検索..."
            className="max-w-lg bg-white"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />

          {filteredSitemaps.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-base text-slate-500">履歴がありません</p>
            </div>
          ) : (
            <>
              {/* デスクトップテーブル */}
              <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                        <TableCell className="font-medium text-slate-900">{sitemap.domain}</TableCell>
                        <TableCell className="max-w-0">
                          <span className="block truncate text-body">{sitemap.topPageTitle}</span>
                        </TableCell>
                        <TableCell className="text-body">{sitemap.totalPages}</TableCell>
                        <TableCell>
                          {sitemap.hasDevUrl
                            ? <Badge>あり</Badge>
                            : <Badge variant="secondary">なし</Badge>}
                        </TableCell>
                        <TableCell className="text-slate-500">{formatDate(sitemap.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleDownload(sitemap.fileName)}>
                              ダウンロード
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
                              onClick={() => setDeleteTarget(sitemap)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="border-t border-slate-100 px-4 py-3 text-center text-sm text-slate-500">
                  全{filteredSitemaps.length}件表示中
                </div>
              </div>

              {/* モバイルカードリスト */}
              <div className="flex md:hidden flex-col gap-3">
                {filteredSitemaps.map((sitemap) => (
                  <div
                    key={sitemap.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-slate-900">{sitemap.domain}</p>
                    <p className="text-xs text-slate-500 truncate">{sitemap.topPageTitle}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{sitemap.totalPages}ページ</Badge>
                      {sitemap.hasDevUrl
                        ? <Badge>開発URLあり</Badge>
                        : <Badge variant="secondary">開発URLなし</Badge>}
                      <span className="text-xs text-slate-500 ml-auto">
                        {formatDate(sitemap.createdAt)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleDownload(sitemap.fileName)}>
                        ダウンロード
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
                        onClick={() => setDeleteTarget(sitemap)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <p className="text-center text-sm text-slate-500">
                  全{filteredSitemaps.length}件表示中
                </p>
              </div>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="履歴を削除しますか？"
        description="このExcelファイルと履歴データは完全に削除されます。この操作は取り消せません。"
        confirmLabel="削除する"
        confirmVariant="destructive"
        loading={deleting}
        loadingLabel="削除中..."
        detail={deleteTarget?.domain}
      />
    </div>
  );
}
