'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  loading?: boolean;
  loadingLabel?: string;
  detail?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = '実行',
  confirmVariant = 'default',
  loading = false,
  loadingLabel,
  detail,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={() => !loading && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
          {detail && (
            <p className="text-sm font-medium text-slate-900 truncate">{detail}</p>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
            {loading ? (loadingLabel ?? '処理中...') : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
