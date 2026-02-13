import * as XLSX from 'xlsx-js-style';
import type { CrawlResult } from '@/lib/types';

interface CrawlResultWithDevUrl extends CrawlResult {
  devUrl?: string;
}

interface FlatData {
  level: number;
  url: string;
  devUrl?: string;
  title: string;
  description: string;
  directoryName: string;
}

export interface ExcelGenerationOptions {
  crawlResult: CrawlResult;
  completedAt?: string;
  includeDirectoryColumns?: boolean;
  devDomain?: string;
}

export interface ExcelGenerationResult {
  buffer: Buffer;
  fileName: string;
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

/**
 * 本番URLから開発URLを生成
 * @param prodUrl 本番URL
 * @param devDomain 開発ドメイン
 * @returns 開発URL（エラー時は空文字列）
 */
function generateDevUrl(prodUrl: string, devDomain: string): string {
  try {
    const prodUrlObj = new URL(prodUrl);
    const devDomainObj = new URL(devDomain);
    return devDomainObj.origin + prodUrlObj.pathname + prodUrlObj.search + prodUrlObj.hash;
  } catch {
    return '';
  }
}

// 罫線スタイル定義
const thinBorder = { style: 'thin', color: { rgb: '000000' } };
const allBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

const headerStyle = {
  border: allBorders,
  font: { bold: true },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const dataCellStyle = {
  border: allBorders,
};

/**
 * 指定範囲のセルにスタイルを一括適用する。
 * セルが存在しない場合は空セルを作成して罫線が描画されるようにする。
 */
function applyStyleToRange(
  ws: XLSX.WorkSheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  style: Record<string, unknown>
): void {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) {
        ws[cellRef] = { t: 's', v: '' };
      }
      ws[cellRef].s = style;
    }
  }
}

function flattenCrawlResult(
  result: CrawlResultWithDevUrl,
  list: FlatData[] = [],
  skipRoot: boolean = false,
  devDomain?: string
): FlatData[] {
  // skipRootがtrueの場合、深度0（ルートノード）を除外
  if (!skipRoot || result.depth > 0) {
    const flatItem: FlatData = {
      level: result.depth,
      url: result.url,
      title: result.title,
      description: result.description || '',
      directoryName: getDirectorySegmentName(result.url)
    };

    // 開発ドメインが指定されている場合、開発URLを生成
    if (devDomain) {
      flatItem.devUrl = generateDevUrl(result.url, devDomain);
    }

    list.push(flatItem);
  }

  for (const child of result.children) {
    flattenCrawlResult(child, list, skipRoot, devDomain);
  }

  return list;
}

/**
 * クロール結果からExcelファイルを生成する共通関数
 */
export async function generateExcelFromCrawlResult(
  options: ExcelGenerationOptions
): Promise<ExcelGenerationResult> {
  const { crawlResult, completedAt, includeDirectoryColumns = false, devDomain } = options;

  // ツリー構造をフラットなリストに変換（常にルートノードを含める）
  const flatData = flattenCrawlResult(crawlResult, [], false, devDomain);

  // 最大レベルを計算
  const maxLevel = Math.max(...flatData.map(d => d.level));

  // ヘッダー行を作成
  const headers: string[] = ['No'];
  for (let i = 0; i <= maxLevel; i++) {
    if (i === 0) {
      headers.push('トップ');
    } else {
      headers.push(`第${i + 1}階層`);
    }
  }
  if (includeDirectoryColumns) {
    for (let i = 1; i <= maxLevel; i++) {
      headers.push(i === 1 ? 'directory' : '');
    }
  }
  headers.push('URL');
  if (devDomain) {
    headers.push('開発URL');
  }
  headers.push('ディスクリプション');
  headers.push('備考'); // 備考列（ディスクリプションのはみ出し防止も兼ねる）

  // データ行を作成（空セルはnullで本当の空セルにする）
  const rows: (string | number | null)[][] = flatData.map((data, index) => {
    const row: (string | number | null)[] = [index + 1];

    // 階層レベルに応じた列にタイトルを配置
    for (let i = 0; i <= maxLevel; i++) {
      row.push(i === data.level ? data.title : null);
    }

    // ディレクトリ列を追加（オプション）
    if (includeDirectoryColumns) {
      for (let i = 1; i <= maxLevel; i++) {
        row.push(i === data.level ? data.directoryName : null);
      }
    }

    row.push(data.url);
    if (devDomain) {
      row.push(data.devUrl || null);
    }
    row.push(data.description);
    row.push(null); // 備考列（初期値は空）
    return row;
  });

  // タイトル行・出力日時行を作成
  const rootTitle = crawlResult.title || '';
  const titleText = `${rootTitle} ディレクトリマップ`;
  // completedAtがあればそれを使用、なければ現在時刻（後方互換性）
  const timestamp = completedAt ? new Date(completedAt) : new Date();
  const dateStr = `${timestamp.getFullYear()}/${String(timestamp.getMonth() + 1).padStart(2, '0')}/${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
  const dateText = `出力日時: ${dateStr}`;

  // タイトル結合範囲: A2からNo列+深度列分（列0〜列maxLevel+1-1）
  const titleMergeEnd = maxLevel + 1; // 0-indexed: 列0(No)〜列maxLevel+1-1(最後の深度列) → end = maxLevel+1
  // システム表記の位置: 結合末尾から2列右
  const systemNoteCol = titleMergeEnd + 2;

  // 行1: 空行, 行2: タイトル+システム表記, 行3: 出力日時(システム表記の下), 行4: 空行
  const row1: (string | number)[] = [];
  const row2: (string | number)[] = [titleText];
  // row2のシステム表記列まで空セルで埋める
  for (let i = 1; i <= systemNoteCol; i++) {
    row2.push(i === systemNoteCol ? 'ディレクトリマップ生成ツールで出力しました' : '');
  }
  const row3: (string | number)[] = [];
  // row3の出力日時をシステム表記の下（同じ列）に配置
  for (let i = 0; i <= systemNoteCol; i++) {
    row3.push(i === systemNoteCol ? dateText : '');
  }
  const row4: (string | number)[] = [];

  // ワークシートを作成（4行のヘッダー + 既存ヘッダー + データ行）
  const wsData = [row1, row2, row3, row4, headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // セル結合: A2（行1, 列0）からタイトル列末尾まで結合
  ws['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: titleMergeEnd } }
  ];

  // 列幅を設定
  const colWidths: XLSX.ColInfo[] = [
    { wch: 6 }, // No列
  ];
  for (let i = 0; i <= maxLevel; i++) {
    colWidths.push({ wch: 25 }); // タイトル列
  }
  if (includeDirectoryColumns) {
    for (let i = 1; i <= maxLevel; i++) {
      colWidths.push({ wch: 20 }); // ディレクトリ列
    }
  }
  colWidths.push({ wch: 50 }); // URL列
  if (devDomain) {
    colWidths.push({ wch: 50 }); // 開発URL列
  }
  colWidths.push({ wch: 60 }); // ディスクリプション列
  colWidths.push({ wch: 20 }); // 備考列
  // システム表記列がヘッダー列数を超える場合、追加の列幅を設定
  while (colWidths.length <= systemNoteCol) {
    colWidths.push({ wch: 35 });
  }
  ws['!cols'] = colWidths;

  // 罫線スタイルを適用
  const totalCols = headers.length;
  const headerRowIndex = 4; // ヘッダー行（行1:空, 行2:タイトル, 行3:日時, 行4:空, 行5:ヘッダー → 0-indexed: 4）
  applyStyleToRange(ws, headerRowIndex, 0, headerRowIndex, totalCols - 1, headerStyle);

  const dataStartRow = 5;
  const dataEndRow = dataStartRow + rows.length - 1;

  // No列（列0）にのみ罫線スタイルを適用
  applyStyleToRange(ws, dataStartRow, 0, dataEndRow, 0, dataCellStyle);
  // 階層列（列1〜maxLevel+1）は後で個別に処理するのでスキップ

  // ディレクトリ列とURL列の処理
  const afterLevelColStart = maxLevel + 2; // 階層列の次の列
  let dirColStart = -1;
  let dirColEnd = -1;
  let urlColStart = afterLevelColStart;

  if (includeDirectoryColumns) {
    dirColStart = afterLevelColStart;
    dirColEnd = afterLevelColStart + (maxLevel - 1); // level 1〜maxLevelなのでmaxLevel個
    urlColStart = dirColEnd + 1;
  }

  // URL列のみに全罫線を適用（ディレクトリ列は後で個別処理）
  if (urlColStart < totalCols) {
    applyStyleToRange(ws, dataStartRow, urlColStart, dataEndRow, totalCols - 1, dataCellStyle);
  }

  // 階層列の罫線を調整
  const levelColStart = 1;             // 列0はNo列、列1〜がトップ/第2階層...
  const levelColEnd = maxLevel + 1;    // 最後の階層列

  for (let r = dataStartRow; r <= dataEndRow; r++) {
    // この行の値セルを探す
    let valueCol = -1;
    for (let c = levelColStart; c <= levelColEnd; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (cell && cell.v != null && cell.v !== '') {
        valueCol = c;
        break;
      }
    }

    const isLastRow = r === dataEndRow;

    // 値セルの下罫線条件: 次行の同列以下に値があるか
    let valueNeedsBottom = isLastRow;
    if (!isLastRow && valueCol >= 0) {
      for (let c = levelColStart; c <= valueCol; c++) {
        const nextRowRef = XLSX.utils.encode_cell({ r: r + 1, c });
        const nextCell = ws[nextRowRef];
        if (nextCell && nextCell.v != null && nextCell.v !== '') {
          valueNeedsBottom = true;
          break;
        }
      }
    }

    for (let c = levelColStart; c <= levelColEnd; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) {
        ws[cellRef] = { t: 's', v: '' };
      }

      const cell = ws[cellRef];
      const hasValue = cell && cell.v != null && cell.v !== '';
      const isLastLevelCol = c === levelColEnd;

      if (hasValue) {
        // 値セル: 上・左・右（最深階層列のみ）・下（条件付き）
        ws[cellRef].s = {
          border: {
            top: thinBorder,
            left: thinBorder,
            right: isLastLevelCol ? thinBorder : undefined,
            bottom: valueNeedsBottom ? thinBorder : undefined,
          },
        };
      } else if (valueCol >= 0 && c > valueCol) {
        // 値セルより右の空セル: 最深階層列のみ右罫線 + 常に下罫線
        ws[cellRef].s = {
          border: {
            right: isLastLevelCol ? thinBorder : undefined,
            bottom: thinBorder,
          },
        };
      } else {
        // 値セルより左の空セル: 左右罫線 + 最終行なら下罫線
        ws[cellRef].s = {
          border: {
            left: thinBorder,
            right: thinBorder,
            bottom: isLastRow ? thinBorder : undefined,
          },
        };
      }
    }
  }

  // ディレクトリ列の罫線を調整（階層列と同じロジック）
  if (includeDirectoryColumns && dirColStart >= 0) {
    for (let r = dataStartRow; r <= dataEndRow; r++) {
      // この行の値セルを探す
      let valueCol = -1;
      for (let c = dirColStart; c <= dirColEnd; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (cell && cell.v != null && cell.v !== '') {
          valueCol = c;
          break;
        }
      }

      const isLastRow = r === dataEndRow;

      // 値セルの下罫線条件: 次行の同列以前に値があるか
      let valueNeedsBottom = isLastRow;
      if (!isLastRow && valueCol >= 0) {
        for (let c = dirColStart; c <= valueCol; c++) {
          const nextRowRef = XLSX.utils.encode_cell({ r: r + 1, c });
          const nextCell = ws[nextRowRef];
          if (nextCell && nextCell.v != null && nextCell.v !== '') {
            valueNeedsBottom = true;
            break;
          }
        }
      }

      for (let c = dirColStart; c <= dirColEnd; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) {
          ws[cellRef] = { t: 's', v: '' };
        }

        const cell = ws[cellRef];
        const hasValue = cell && cell.v != null && cell.v !== '';
        const isLastDirCol = c === dirColEnd;

        if (hasValue) {
          // 値セル: 上・左・右（最深階層列のみ）・下（条件付き）
          ws[cellRef].s = {
            border: {
              top: thinBorder,
              left: thinBorder,
              right: isLastDirCol ? thinBorder : undefined,
              bottom: valueNeedsBottom ? thinBorder : undefined,
            },
          };
        } else if (valueCol < 0 || c > valueCol) {
          // 値セルより右の空セル（valueCol < 0の場合は全セルが空なので全て「右」扱い）: 最深階層列のみ右罫線 + 常に下罫線
          ws[cellRef].s = {
            border: {
              right: isLastDirCol ? thinBorder : undefined,
              bottom: thinBorder,
            },
          };
        } else {
          // 値セルより左の空セル: 左右罫線 + 最終行なら下罫線
          ws[cellRef].s = {
            border: {
              left: thinBorder,
              right: thinBorder,
              bottom: isLastRow ? thinBorder : undefined,
            },
          };
        }
      }
    }
  }

  // スタイル適用で追加した空セルを含むようにシート範囲を更新
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  if (range.e.r < dataEndRow) range.e.r = dataEndRow;
  if (range.e.c < totalCols - 1) range.e.c = totalCols - 1;
  ws['!ref'] = XLSX.utils.encode_range(range);

  // ワークブックを作成
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'サイトマップ');

  // Excelファイルをバッファに書き込み
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // ファイル名はfileManager.tsで生成されるため、空文字列を返す（後方互換性のため）
  return {
    buffer: Buffer.from(buffer),
    fileName: ''
  };
}
