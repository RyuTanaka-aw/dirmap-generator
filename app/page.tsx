'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { CrawlArtifactStatus, CrawlJobDetail, CrawlJobStatus } from '@/lib/types';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const ACTIVE_JOB_STORAGE_KEY = 'dirmap-active-job-id';

interface CrawlJobStartResponse {
  jobId: string;
  status: CrawlJobStatus;
  createdAt: string;
}

function formatDate(isoString?: string) {
  if (!isoString) {
    return '-';
  }

  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function readApiPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return {
    error: text.includes('<html') ? 'サーバーがHTMLエラーページを返しました' : 'サーバーが非JSONレスポンスを返しました',
    details: text || 'レスポンス本文が空でした'
  };
}

function isOpenJob(job: CrawlJobDetail | null): boolean {
  return job?.status === 'queued' || job?.status === 'running';
}

function getStatusLabel(status?: CrawlJobStatus): string {
  switch (status) {
    case 'queued':
      return '待機中';
    case 'running':
      return '実行中';
    case 'completed':
      return '完了';
    case 'failed':
      return '失敗';
    default:
      return '-';
  }
}

function getStatusBadgeVariant(status?: CrawlJobStatus): 'secondary' | 'default' | 'success' | 'destructive' {
  switch (status) {
    case 'queued':
      return 'secondary';
    case 'running':
      return 'default';
    case 'completed':
      return 'success';
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getArtifactLabel(status?: CrawlArtifactStatus): string {
  switch (status) {
    case 'pending':
      return '未生成';
    case 'ready':
      return '生成完了';
    case 'failed':
      return '生成失敗';
    default:
      return '-';
  }
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [devDomain, setDevDomain] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useAuth, setUseAuth] = useState(false);
  const [excludePatterns, setExcludePatterns] = useState('');
  const [includeDirectoryColumns, setIncludeDirectoryColumns] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<CrawlJobDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedJobId = window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (storedJobId) {
      setJobId(storedJobId);
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, jobId);
  }, [jobId]);

  useEffect(() => {
    if (!isOpenJob(job)) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [job]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let cancelled = false;

    const pollJob = async () => {
      try {
        const response = await fetch(`${BASE_PATH}/api/crawl-jobs/${jobId}`, {
          cache: 'no-store'
        });
        const payload = await readApiPayload(response) as Partial<CrawlJobDetail> & {
          error?: string;
          details?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || 'エラーが発生しました');
        }

        if (cancelled) {
          return;
        }

        setJob(payload as CrawlJobDetail);
        setError('');

        if (payload.status === 'completed' || payload.status === 'failed') {
          window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
          cancelled = true;
        }
      } catch {
        // ポーリング中の一時的なエラーは無視（ジョブ失敗時は job.error で表示される）
      }
    };

    void pollJob();

    const intervalId = window.setInterval(() => {
      if (!cancelled) {
        void pollJob();
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [jobId]);

  const handleConfirmCrawl = () => {
    setShowConfirmDialog(false);
    void handleCrawl();
  };

  const handleCrawl = async () => {
    setSubmitting(true);
    setError('');
    setJob(null);

    try {
      const response = await fetch(`${BASE_PATH}/api/crawl-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          username: useAuth ? username : undefined,
          password: useAuth ? password : undefined,
          excludePatterns: excludePatterns.split(',').map((pattern) => pattern.trim()).filter(Boolean),
          includeDirectoryColumns,
          devDomain: devDomain || undefined
        }),
      });

      const payload = await readApiPayload(response) as Partial<CrawlJobStartResponse> & {
        error?: string;
        details?: string;
        activeJobId?: string;
      };

      if (response.status === 409 && payload.activeJobId) {
        setJobId(payload.activeJobId);
        setError(payload.error || '別のクロールジョブが実行中です');
        return;
      }

      if (!response.ok || !payload.jobId) {
        throw new Error(payload.error || 'エラーが発生しました');
      }

      setJobId(payload.jobId);
    } catch (requestError: unknown) {
      const errorMessage = requestError instanceof Error ? requestError.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!job?.resultFileName) {
      alert('保存されたファイルが見つかりません');
      return;
    }

    try {
      const response = await fetch(`${BASE_PATH}/api/download/${job.resultFileName}`);

      if (!response.ok) {
        const payload = await readApiPayload(response) as { error?: string };
        throw new Error(payload.error || 'ファイルのダウンロードに失敗しました');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = job.resultFileName;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(anchor);
    } catch {
      alert('Excelのダウンロードに失敗しました');
    }
  };

  return (
    <div className="max-w-[640px] mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">クロール設定</h1>
        <p className="text-sm text-slate-500 mt-1">対象URLを指定してディレクトリマップを生成します</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">対象URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="devDomain">開発環境URL（任意）</Label>
            <Input
              id="devDomain"
              value={devDomain}
              onChange={(event) => setDevDomain(event.target.value)}
              placeholder="http://localhost:3000"
            />
            <p className="text-xs text-slate-400">対象URLが本番環境の場合、開発環境のURLを指定すると出力にドメインを置換したURLも並べて表示します</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="excludePatterns">除外パターン（任意）</Label>
            <Input
              id="excludePatterns"
              value={excludePatterns}
              onChange={(event) => setExcludePatterns(event.target.value)}
              placeholder="/admin/, /api/"
            />
            <p className="text-xs text-slate-400">カンマ区切りでパスを指定します（例: /admin/, /api/）</p>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-2 flex flex-col gap-4">
            <p className="text-sm font-medium text-slate-500">オプション</p>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Checkbox id="useAuth" checked={useAuth} onCheckedChange={(checked) => setUseAuth(Boolean(checked))} />
                <Label htmlFor="useAuth" className="font-medium cursor-pointer">Basic認証が必要</Label>
              </div>
              <p className="text-xs text-slate-400 pl-6">クロール対象サイトにBasic認証が設定されている場合にチェック</p>
            </div>

            {useAuth && (
              <div className="flex flex-col md:flex-row gap-4 pl-6 bg-gray-50 rounded-lg p-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="username">ユーザー名</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="username"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="password"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeDir"
                  checked={includeDirectoryColumns}
                  onCheckedChange={(checked) => setIncludeDirectoryColumns(Boolean(checked))}
                />
                <Label htmlFor="includeDir" className="font-medium cursor-pointer">
                  ディレクトリパス列を追加
                </Label>
              </div>
              <p className="text-xs text-slate-400 pl-6">Excelにディレクトリ階層ごとのパス列を追加します</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => setShowConfirmDialog(true)}
            disabled={submitting || isOpenJob(job) || !url}
          >
            {submitting ? 'ジョブ作成中...' : 'クロール開始'}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!job && jobId && !error && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            <span className="text-sm text-slate-500">ジョブを読み込み中...</span>
          </CardContent>
        </Card>
      )}

      {job && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {isOpenJob(job) ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              ) : (
                <CircleCheck className="w-5 h-5 text-primary-500" />
              )}
              <CardTitle>クロールジョブ</CardTitle>
            </div>
            <CardDescription>
              ジョブID: {job.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-slate-500">対象URL</span>
              <span className="font-medium text-slate-900 text-right max-w-[70%] truncate" title={job.requestedUrl}>{job.requestedUrl}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">状態</span>
              <Badge variant={getStatusBadgeVariant(job.status)} className={job.status === 'running' ? 'animate-pulse' : ''}>
                {getStatusLabel(job.status)}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">成果物</span>
              <span className="font-medium text-slate-900">{getArtifactLabel(job.artifactStatus)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">進捗率</span>
              <span className="font-medium text-primary-500">{job.progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${job.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">訪問済みページ数</span>
              <span className="font-medium text-slate-900">{job.visitedCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">キュー残数</span>
              <span className="font-medium text-slate-900">
                {job.status === 'completed' || job.status === 'failed' ? '—' : job.queuedCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">失敗数</span>
              <span className="font-medium text-slate-900">{job.failedCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-slate-500">処理中 / 最終URL</span>
              <span className="font-medium text-slate-900 text-right max-w-[70%] truncate" title={job.lastProcessedUrl || undefined}>{job.lastProcessedUrl || '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">完了時刻</span>
              <span className="font-medium text-slate-900">{formatDate(job.completedAt)}</span>
            </div>
            {job.error && (
              <Alert variant="destructive">
                <AlertDescription>{job.error}</AlertDescription>
              </Alert>
            )}
            {job.artifactError && (
              <Alert>
                <AlertDescription>
                  Excel生成に失敗しました。クロール自体は完了しています。
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={handleExportToExcel}
              disabled={job.status !== 'completed' || job.artifactStatus !== 'ready' || !job.resultFileName}
            >
              Excelファイルをダウンロード
            </Button>
            {(job.status !== 'completed' || job.artifactStatus !== 'ready' || !job.resultFileName) && (
              <p className="text-xs text-slate-400 text-center">クロール完了後にダウンロードできます</p>
            )}
          </CardFooter>
        </Card>
      )}

      <ConfirmDialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmCrawl}
        title="クロールを開始しますか？"
        description="開始後はバックグラウンドジョブとして進行します。進捗はこの画面で確認できます。"
        confirmLabel="クロール開始"
      />
    </div>
  );
}
