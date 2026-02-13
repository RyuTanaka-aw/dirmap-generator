import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { CrawlResult, SitemapMetadata, SitemapsData } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
const METADATA_FILE = path.join(DATA_DIR, 'sitemaps.json');

/**
 * 必要なディレクトリが存在することを確認（存在しなければ作成）
 */
export async function ensureDirectories(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(EXPORTS_DIR, { recursive: true });

    // sitemaps.jsonが存在しない場合は初期化
    try {
      await fs.access(METADATA_FILE);
    } catch {
      const initialData: SitemapsData = {
        version: '1.0',
        sitemaps: [],
      };
      await fs.writeFile(METADATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('ディレクトリ初期化エラー:', error);
    throw error;
  }
}

/**
 * URLからファイル名を生成
 * 例: https://www.example.com → examplecom_20260213.xlsx
 */
export function generateFileName(url: string, timestamp?: Date): string {
  try {
    const hostname = new URL(url).hostname;

    // www. プレフィックスを削除
    const cleanHostname = hostname.replace(/^www\./, '');

    // ドット（.）を完全削除
    const withoutDots = cleanHostname.replace(/\./g, '');

    // ハイフン（-）をアンダースコア（_）に置換
    const normalized = withoutDots.replace(/-/g, '_');

    // 日付を YYYYMMDD 形式で生成
    const date = timestamp || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    return `${normalized}_${dateStr}.xlsx`;
  } catch (error) {
    console.error('ファイル名生成エラー:', error);
    // フォールバック
    const timestampNum = Date.now();
    return `sitemap_${timestampNum}.xlsx`;
  }
}

/**
 * 連番を考慮したユニークなファイル名を生成
 * 同じベース名のファイルが既に存在する場合は _2, _3, ... を付与
 */
async function generateUniqueFileName(
  url: string,
  timestamp?: Date
): Promise<string> {
  try {
    // ベースファイル名を生成
    const baseFileName = generateFileName(url, timestamp);

    // 拡張子を除いたベース名を取得
    const baseNameWithoutExt = baseFileName.replace(/\.xlsx$/, '');

    // 既存のメタデータを読み込み
    const data = await readSitemapsData();

    // 同じベースファイル名パターンを持つファイルを検出
    // パターン: baseName.xlsx, baseName_2.xlsx, baseName_3.xlsx, ...
    const pattern = new RegExp(`^${baseNameWithoutExt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:_(\\d+))?\\.xlsx$`);

    const existingNumbers: number[] = [];

    for (const sitemap of data.sitemaps) {
      const match = sitemap.fileName.match(pattern);
      if (match) {
        if (match[1]) {
          // 連番あり（例: _2, _3）
          existingNumbers.push(parseInt(match[1], 10));
        } else {
          // 連番なし（元のファイル）→ 1扱い
          existingNumbers.push(1);
        }
      }
    }

    // 既存ファイルがない場合はベースファイル名をそのまま返す
    if (existingNumbers.length === 0) {
      return baseFileName;
    }

    // 最大連番+1を計算
    const maxNumber = Math.max(...existingNumbers);
    const nextNumber = maxNumber + 1;

    return `${baseNameWithoutExt}_${nextNumber}.xlsx`;
  } catch (error) {
    console.error('ユニークファイル名生成エラー:', error);
    // エラー時はベースファイル名を返す（上書きリスクあり）
    return generateFileName(url, timestamp);
  }
}

/**
 * CrawlResultツリーから総ページ数をカウント
 */
export function countTotalPages(result: CrawlResult): number {
  let count = 1; // 自身をカウント

  if (result.children && result.children.length > 0) {
    for (const child of result.children) {
      count += countTotalPages(child);
    }
  }

  return count;
}

/**
 * CrawlResultツリーから開発URL含有フラグを判定
 */
export function hasDevUrl(result: CrawlResult): boolean {
  if (result.devUrl) {
    return true;
  }

  if (result.children && result.children.length > 0) {
    for (const child of result.children) {
      if (hasDevUrl(child)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Excelファイルをサーバーに保存
 * ファイル名は内部で生成し、連番を考慮したユニーク名を使用
 */
export async function saveExcelFile(
  buffer: Buffer,
  url: string,
  timestamp?: Date
): Promise<{ filePath: string; fileName: string }> {
  await ensureDirectories();

  // 内部でユニークファイル名を生成
  const fileName = await generateUniqueFileName(url, timestamp);
  const filePath = path.join(EXPORTS_DIR, fileName);

  await fs.writeFile(filePath, buffer);

  return { filePath, fileName };
}

/**
 * sitemaps.jsonを読み込み
 */
export async function readSitemapsData(): Promise<SitemapsData> {
  try {
    await ensureDirectories();
    const content = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(content) as SitemapsData;
  } catch (error) {
    console.error('メタデータ読み込みエラー:', error);
    // ファイル未存在時は初期データを返却
    return {
      version: '1.0',
      sitemaps: [],
    };
  }
}

/**
 * メタデータを追加してsitemaps.jsonを更新
 */
export async function addSitemapMetadata(
  url: string,
  topPageTitle: string,
  fileName: string,
  filePath: string,
  crawlResult: CrawlResult
): Promise<void> {
  await ensureDirectories();

  const data = await readSitemapsData();

  const metadata: SitemapMetadata = {
    id: uuidv4(),
    domain: url,
    topPageTitle,
    createdAt: new Date().toISOString(),
    completedAt: crawlResult.completed_at || new Date().toISOString(),
    filePath,
    fileName,
    totalPages: countTotalPages(crawlResult),
    hasDevUrl: hasDevUrl(crawlResult),
  };

  // 先頭に挿入（最新のものが最初に表示されるように）
  data.sitemaps.unshift(metadata);

  await fs.writeFile(METADATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
