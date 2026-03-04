import { NextResponse } from 'next/server';
import { readSitemapsData } from '@/lib/fileManager';

/**
 * GET /api/sitemaps
 * ディレクトリマップのメタデータ一覧を取得
 */
export async function GET() {
  try {
    const data = await readSitemapsData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('メタデータ取得エラー:', error);
    return NextResponse.json(
      { error: 'メタデータの取得に失敗しました' },
      { status: 500 }
    );
  }
}
