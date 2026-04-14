'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { FeedbackEntry } from '@/lib/types';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadFeedbacks = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_PATH}/api/feedback`, { cache: 'no-store' });
      if (!response.ok) throw new Error('取得に失敗しました');
      const payload = await response.json() as { feedbacks: FeedbackEntry[] };
      setFeedbacks(payload.feedbacks);
      setFetchError('');
    } catch {
      setFetchError('投稿一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeedbacks();
  }, [loadFeedbacks]);

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);

    try {
      const response = await fetch(`${BASE_PATH}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        throw new Error(payload.error || '送信に失敗しました');
      }

      setMessage('');
      await loadFeedbacks();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '送信に失敗しました';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[640px] mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ご意見箱</h1>
        <p className="text-sm text-slate-500 mt-1">匿名で投稿できます。投稿内容は全員が閲覧できます。</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <Label htmlFor="message">不具合・要望・その他なんでも</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSubmitError('');
            }}
            placeholder="気になったことをお気軽にどうぞ"
            rows={4}
          />
          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
          >
            {submitting ? '送信中...' : '送信する'}
          </Button>
        </CardFooter>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-slate-700">投稿一覧</h2>

        {loading ? (
          <p className="text-sm text-slate-400">読み込み中...</p>
        ) : fetchError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        ) : feedbacks.length === 0 ? (
          <p className="text-sm text-slate-400">まだ投稿はありません</p>
        ) : (
          feedbacks.map((fb) => (
            <Card key={fb.id}>
              <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                <p className="text-sm text-slate-900 whitespace-pre-wrap">{fb.message}</p>
                <p className="text-xs text-slate-400">{formatDate(fb.createdAt)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
