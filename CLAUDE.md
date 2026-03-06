# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ビルド・実行コマンド

```bash
npm run dev      # 開発サーバー起動（localhost:3000）
npm run build    # 本番ビルド（standalone出力）
npm start        # 本番サーバー起動
npm run lint     # ESLint実行（Next.js core web vitals + TypeScript）
```

テストフレームワークは未導入。

## アーキテクチャ

Webサイトを再帰的にクロールし、ディレクトリマップデータをExcelファイルとして出力する **Next.js 15（App Router）** のWebツール。UIは全て日本語。

### 主要コンポーネント

- **`app/page.tsx`** — シングルページのクライアントコンポーネント。URL入力、クロール設定（深度、除外パターン、Basic認証）、結果のツリー表示、Excel出力を担当。
- **`lib/crawler.ts`** — クロールエンジン本体。BFS方式の再帰クローラー。URL正規化、同一ドメインフィルタリング、URLパスセグメントによる深度制限、Basic認証のリダイレクト対応、フラットなURLリストからのツリー構造構築を行う。HTMLパースには軽量な`linkedom`を使用。
- **`app/api/crawl-recursive/route.ts`** — POSTエンドポイント。クロールパラメータ（url, maxDepth, credentials, excludePatterns）を受け取り、`CrawlResult`ツリーを返す。
- **`app/api/generate-excel-from-crawl/route.ts`** — POSTエンドポイント。`CrawlResult`ツリーからXLSXファイルを生成。ディレクトリパスカラムのオプション付き。シート名は「ディレクトリマップ」。
- **`app/api/generate-excel/route.ts`** — サンプル用のExcel生成エンドポイント。

### データフロー

1. ユーザーがURL＋オプションを送信 → `POST /api/crawl-recursive`
2. クローラーがBFSでページを取得（リクエスト間100ms遅延、ページあたり10秒タイムアウト、最大5リダイレクト）
3. `CrawlResult`ツリー（`{ url, title, depth, children }`）を返却
4. ユーザーがエクスポートボタンを押下 → `POST /api/generate-excel-from-crawl` にツリーデータを送信
5. タイムスタンプ付きXLSXファイル（`sitemap_YYYY-MM-DD.xlsx`）を返却

### 技術スタック

- Next.js 15 / React 19 / TypeScript 5
- Tailwind CSS 4（`@tailwindcss/postcss`経由）
- `linkedom`（HTMLパース）、`xlsx`（Excel生成）、`robots-parser`（robots.txt解析）
- パスエイリアス: `@/*` → プロジェクトルート
- デプロイ先: standalone出力（Deno Deploy）
