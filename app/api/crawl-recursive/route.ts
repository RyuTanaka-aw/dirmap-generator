import { NextResponse } from 'next/server';
import { crawlSite } from '@/lib/crawler';
import { generateExcelFromCrawlResult } from '@/lib/excelGenerator';
import { saveExcelFile, addSitemapMetadata } from '@/lib/fileManager';

export async function POST(request: Request) {
  try {
    const { url, username, password, excludePatterns, includeDirectoryColumns, devDomain } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });
    }

    console.log('クロール開始:', url);

    const result = await crawlSite({
      url,
      username,
      password,
      excludePatterns: excludePatterns || []
    });

    const completedAt = new Date().toISOString();
    console.log('クロール完了:', completedAt);

    // クロール完了後、自動的にExcelを生成してサーバーに保存
    let savedFileName: string | null = null;
    try {
      const { buffer, fileName } = await generateExcelFromCrawlResult({
        crawlResult: result,
        completedAt,
        includeDirectoryColumns,
        devDomain
      });

      const filePath = await saveExcelFile(buffer, fileName);
      await addSitemapMetadata(url, result.title, fileName, filePath, {
        ...result,
        completed_at: completedAt
      });

      savedFileName = fileName;
      console.log('サーバー保存成功:', fileName);
    } catch (saveError) {
      console.error('自動保存エラー:', saveError);
      // エラーでもクロール結果は返す（ユーザーは手動ダウンロード可能）
    }

    return NextResponse.json({
      result,
      completedAt,
      savedFileName
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('クロールエラー:', errorMessage);

    const isAuthError = errorMessage.includes('401') || errorMessage.includes('認証に失敗');
    return NextResponse.json({
      error: isAuthError
        ? 'Basic認証に失敗しました。ユーザー名とパスワードを確認してください。'
        : 'クロールに失敗しました',
      details: errorMessage
    }, { status: isAuthError ? 401 : 500 });
  }
}
