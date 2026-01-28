import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

interface CrawlResult {
  url: string;
  title: string;
  depth: number;
  children: CrawlResult[];
}

interface FlatData {
  level: number;
  url: string;
  title: string;
  directoryName: string;
}

/**
 * URLから最後のパスセグメント名を取得（ディレクトリ列用）
 * 例: "https://example.com/plan" → "plan/"
 *     "https://example.com/page.html" → "page.html"
 *     "https://example.com/" → ""
 */
function getDirectorySegmentName(url: string): string {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(p => p !== '');
    if (parts.length === 0) return '';
    const lastSegment = parts[parts.length - 1];
    if (lastSegment.includes('.')) return lastSegment;
    return lastSegment + '/';
  } catch {
    return '';
  }
}

function flattenCrawlResult(result: CrawlResult, list: FlatData[] = []): FlatData[] {
  list.push({
    level: result.depth,
    url: result.url,
    title: result.title,
    directoryName: getDirectorySegmentName(result.url)
  });

  for (const child of result.children) {
    flattenCrawlResult(child, list);
  }

  return list;
}

export async function POST(request: Request) {
  try {
    const { crawlResult, includeDirectoryColumns = false } = await request.json();

    if (!crawlResult) {
      return NextResponse.json({ error: 'クロール結果が必要です' }, { status: 400 });
    }

    // ツリー構造をフラットなリストに変換
    const flatData = flattenCrawlResult(crawlResult);

    // 最大レベルを計算
    const maxLevel = Math.max(...flatData.map(d => d.level));

    // ヘッダー行を作成
    const headers: string[] = ['No'];
    for (let i = 0; i <= maxLevel; i++) {
      headers.push(i === 0 ? 'contents title' : '');
    }
    if (includeDirectoryColumns) {
      for (let i = 0; i <= maxLevel; i++) {
        headers.push(i === 0 ? 'directory' : '');
      }
    }
    headers.push('URL');

    // データ行を作成
    const rows: (string | number)[][] = flatData.map((data, index) => {
      const row: (string | number)[] = [index + 1];

      // 階層レベルに応じた列にタイトルを配置
      for (let i = 0; i <= maxLevel; i++) {
        row.push(i === data.level ? data.title : '');
      }

      // ディレクトリ列を追加（オプション）
      if (includeDirectoryColumns) {
        for (let i = 0; i <= maxLevel; i++) {
          row.push(i === data.level ? data.directoryName : '');
        }
      }

      row.push(data.url);
      return row;
    });

    // ワークシートを作成
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 列幅を設定
    const colWidths: XLSX.ColInfo[] = [
      { wch: 6 }, // No列
    ];
    for (let i = 0; i <= maxLevel; i++) {
      colWidths.push({ wch: 25 }); // タイトル列
    }
    if (includeDirectoryColumns) {
      for (let i = 0; i <= maxLevel; i++) {
        colWidths.push({ wch: 20 }); // ディレクトリ列
      }
    }
    colWidths.push({ wch: 50 }); // URL列
    ws['!cols'] = colWidths;

    // ワークブックを作成
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'サイトマップ');

    // Excelファイルをバッファに書き込み
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `sitemap_${timestamp}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${filename}`
      }
    });

  } catch (error) {
    console.error('Excel生成エラー:', error);
    return NextResponse.json({ error: 'Excel生成に失敗しました' }, { status: 500 });
  }
}
