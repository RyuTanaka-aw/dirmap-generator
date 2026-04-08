# CLAUDE.md

This file provides guidance to coding agents working in this repository.

## ビルド・実行コマンド

```bash
npm run dev
npm run build
npm start
npm run lint
```

テストフレームワークは未導入。

## アーキテクチャ

Next.js 15 App Router ベースのディレクトリマップ生成ツール。UI は日本語。

### 主要コンポーネント

- `app/page.tsx` - クロールジョブ作成と進捗ポーリング UI
- `app/history/page.tsx` - 完成済み Excel 履歴一覧
- `app/api/crawl-jobs/route.ts` - ジョブ作成 API
- `app/api/crawl-jobs/[id]/route.ts` - ジョブ状態取得 API
- `lib/crawlJobs.ts` - ファイルベースのジョブ永続化、排他ロック、stale job 回収、成果物生成
- `lib/crawler.ts` - BFS ベースのクロール本体と階層構築
- `lib/excelGenerator.ts` - `CrawlResult` から Excel を生成
- `lib/fileManager.ts` - 履歴メタデータと Excel 保存

### データフロー

1. ユーザーが `POST /api/crawl-jobs` を送信
2. `lib/crawlJobs.ts` が `data/jobs/active-job.lock` を取得してジョブを作成
3. バックグラウンドでクロールし、各ページを `pages.ndjson` へ追記しながら `job.json` を更新
4. 完了後に `pages.ndjson` から `CrawlResult` を復元し、Excel を生成して `data/exports/` に保存
5. 成功した成果物だけ `data/sitemaps.json` に履歴登録
6. UI は `GET /api/crawl-jobs/:id` をポーリングして状態表示

### 永続データ

- `data/exports/` - 生成済み Excel
- `data/sitemaps.json` - 履歴メタデータ
- `data/jobs/<jobId>/job.json` - ジョブ状態
- `data/jobs/<jobId>/pages.ndjson` - クロール結果の中間保存
- `data/jobs/<jobId>/events.ndjson` - エラーや回収ログ
- `data/jobs/active-job.lock` - 単一ジョブ排他ロック

### 運用前提

- 単一サーバーへ直接配備
- `next start` で単一プロセス常駐
- v1 は 1 ジョブ排他、途中再開なし
- サーバー停止後に残った `running` / `queued` ジョブは、次回ジョブ API アクセス時に `failed` へ回収

### デザインガイドライン

**スタイリング基盤**

- Tailwind CSS v4 + CVA（class-variance-authority）を使用
- カスタムトークンは `app/globals.css` の `@theme` ディレクティブで定義（`tailwind.config` は存在しない）

**カラートークン**

| トークン | 用途 |
|---|---|
| `primary-50`〜`primary-950` | ブランドカラースケール（メイン: `primary-500 = #2b70ef`） |
| `body` (`#3d4b5f`) | 本文テキスト色（`text-body` で使用） |
| `slate-*` | ラベル・サブテキスト・ボーダー |
| `gray-*` | 背景・ホバー面 |

ブランドカラー以外に独自カラーを追加する場合は `app/globals.css` の `@theme` に追記する。

**フォント**

Inter（`next/font/google`）をメインフォントとし、`Hiragino Sans` / `Noto Sans JP` を日本語フォールバックとして設定済み。

**UIコンポーネント**

`components/ui/` に shadcn/ui ベースのコンポーネントを CVA でカスタマイズして配置している。

| コンポーネント | バリアント定義箇所 |
|---|---|
| Button | `variant` × `size` の2軸 CVA |
| Badge | `variant`（default / secondary / destructive / success / outline / ghost / link） |
| Alert | `variant`（default / destructive） |
| Card | バリアントなし（構造スロットのみ） |
| Input / Checkbox / Label / Table | バリアントなし |

新規コンポーネントを追加する場合は `components/ui/` に同パターンで追加し、`primary-*` / `slate-*` トークンを使用すること。

**レイアウト構造**

```
AppLayout (components/AppLayout.tsx)
├── Sidebar (components/Sidebar.tsx)  ← w-64, 固定
└── <main>  ← lg:ml-64 でオフセット
    └── {children}  ← px-6 py-8 md:px-8 md:py-10
```

- デスクトップ（`lg` 以上）: 固定サイドバー + メインコンテンツ並列
- モバイル: ハンバーガーメニュー + ドロワー方式（`z-50`）
