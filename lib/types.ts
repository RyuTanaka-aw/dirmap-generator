export interface CrawlResult {
  url: string;
  title: string;
  depth: number;
  children: CrawlResult[];
  description?: string;
  devUrl?: string;
  notes?: string;
  completed_at?: string;
}

export interface SitemapMetadata {
  id: string;                      // UUID
  domain: string;                  // 元のドメイン（https://example.com）
  topPageTitle: string;            // TOPページタイトル
  createdAt: string;               // 生成日時（ISO 8601）
  completedAt: string;             // クロール完了日時
  filePath: string;                // Excelファイルパス
  fileName: string;                // ファイル名（examplecom_20260213.xlsx）
  totalPages: number;              // 総ページ数
  hasDevUrl: boolean;              // 開発URL含有フラグ
}

export interface SitemapsData {
  version: string;
  sitemaps: SitemapMetadata[];
}
