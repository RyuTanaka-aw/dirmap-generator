import { NextResponse } from 'next/server';
import { saveExcelFile, addSitemapMetadata } from '@/lib/fileManager';
import { generateExcelFromCrawlResult } from '@/lib/excelGenerator';

export async function POST(request: Request) {
  try {
    const { crawlResult, completedAt, includeDirectoryColumns = false, devDomain } = await request.json();

    if (!crawlResult) {
      return NextResponse.json({ error: 'クロール結果が必要です' }, { status: 400 });
    }

    // 共通のExcel生成関数を使用
    const { buffer, fileName } = await generateExcelFromCrawlResult({
      crawlResult,
      completedAt,
      includeDirectoryColumns,
      devDomain
    });

    // サーバーにファイルを保存（エラーが発生してもクライアントへのレスポンスは継続）
    try {
      const filePath = await saveExcelFile(buffer, fileName);
      await addSitemapMetadata(
        crawlResult.url,
        crawlResult.title,
        fileName,
        filePath,
        crawlResult
      );
      console.log('サーバー保存成功:', fileName);
    } catch (saveError) {
      console.error('サーバー保存エラー:', saveError);
      // クライアントには通常通りBlobを返却（ダウンロードは成功）
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${fileName}`
      }
    });

  } catch (error) {
    console.error('Excel生成エラー:', error);
    return NextResponse.json({ error: 'Excel生成に失敗しました' }, { status: 500 });
  }
}
