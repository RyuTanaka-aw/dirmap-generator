import { NextResponse } from 'next/server';
import { deleteSitemapById } from '@/lib/fileManager';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DELETE /api/sitemaps/:id
 * 指定IDの履歴を削除（メタデータ + Excelファイル）
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: '無効なIDです' }, { status: 400 });
  }

  try {
    await deleteSitemapById(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === '指定されたIDの履歴が見つかりません') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('削除エラー:', error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
