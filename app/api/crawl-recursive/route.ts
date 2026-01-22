import { NextResponse } from 'next/server';
import { crawlSite } from '@/lib/crawler';

export async function POST(request: Request) {
  try {
    const { url, maxDepth, username, password, excludePatterns } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });
    }

    console.log('クロール開始:', url);

    const result = await crawlSite({
      url,
      maxDepth: maxDepth || 2,
      username,
      password,
      excludePatterns: excludePatterns || []
    });

    console.log('クロール完了');

    return NextResponse.json(result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('クロールエラー:', errorMessage);
    return NextResponse.json({
      error: 'クロールに失敗しました',
      details: errorMessage
    }, { status: 500 });
  }
}
