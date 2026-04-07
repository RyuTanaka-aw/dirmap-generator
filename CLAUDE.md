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
