import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // サンプルデータを追加（階層構造を模擬）
    const sampleData = [
      { level: 0, url: 'https://example.com/', title: 'ホーム' },
      { level: 1, url: 'https://example.com/about', title: '会社情報' },
      { level: 2, url: 'https://example.com/about/company', title: '会社概要' },
      { level: 2, url: 'https://example.com/about/team', title: 'チーム紹介' },
      { level: 1, url: 'https://example.com/products', title: '製品情報' },
      { level: 2, url: 'https://example.com/products/product-a', title: '製品A' },
      { level: 2, url: 'https://example.com/products/product-b', title: '製品B' },
    ];

    // 最大レベルを計算
    const maxLevel = Math.max(...sampleData.map(d => d.level));

    // ヘッダー行を作成
    const headers: string[] = ['No'];
    for (let i = 0; i <= maxLevel; i++) {
      headers.push(i === 0 ? 'contents title' : '');
    }
    headers.push('URL');

    // データ行を作成
    const rows: (string | number)[][] = sampleData.map((data, index) => {
      const row: (string | number)[] = [index + 1];

      // 階層レベルに応じた列にタイトルを配置
      for (let i = 0; i <= maxLevel; i++) {
        row.push(i === data.level ? data.title : '');
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
    colWidths.push({ wch: 40 }); // URL列
    ws['!cols'] = colWidths;

    // ワークブックを作成
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'テストシート');

    // Excelファイルをバッファに書き込み
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // レスポンスを返す
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=sitemap-test.xlsx'
      }
    });

  } catch (error) {
    console.error('Excel生成エラー:', error);
    return NextResponse.json({ error: 'Excel生成に失敗しました' }, { status: 500 });
  }
}
