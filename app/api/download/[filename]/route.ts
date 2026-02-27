import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { readSitemapsData } from '@/lib/fileManager';

const EXPORTS_DIR = path.join(process.cwd(), 'data', 'exports');

/**
 * GET /api/download/[filename]
 * Excelファイルをダウンロード
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // セキュリティチェック1: パストラバーサル攻撃防止
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: '不正なファイル名です' },
        { status: 400 }
      );
    }

    // セキュリティチェック2: 拡張子チェック
    if (!filename.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です' },
        { status: 400 }
      );
    }

    // セキュリティチェック3: ホワイトリストチェック
    const data = await readSitemapsData();
    const exists = data.sitemaps.some((s) => s.fileName === filename);
    if (!exists) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      );
    }

    // ファイル読み込み
    const filePath = path.join(EXPORTS_DIR, filename);
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${filename}`,
      },
    });
  } catch (error) {
    console.error('ファイルダウンロードエラー:', error);
    return NextResponse.json(
      { error: 'ファイルのダウンロードに失敗しました' },
      { status: 500 }
    );
  }
}
