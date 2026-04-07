# dirmap-generator

Web サイトをクロールし、ディレクトリマップを Excel として出力する Next.js 15 アプリです。

## 開発

```bash
npm install
npm run dev
```

本番ビルドと起動:

```bash
npm run build
npm start
```

## 現在の動作

- クロール開始は `POST /api/crawl-jobs`
- 進捗確認は `GET /api/crawl-jobs/:id`
- UI はジョブ作成後にポーリングして状態を表示
- 完了後にサーバー側で Excel を自動生成し、履歴へ登録

## 永続データ

アプリはローカルファイルを使って状態を保存します。単一サーバーへの直接配備を前提にしています。

- `data/exports/`: 生成済み Excel
- `data/sitemaps.json`: 完了済み履歴一覧
- `data/jobs/<jobId>/job.json`: ジョブ状態
- `data/jobs/<jobId>/pages.ndjson`: クロール済みページの中間保存
- `data/jobs/<jobId>/events.ndjson`: ジョブ診断ログ
- `data/jobs/active-job.lock`: 単一実行ロック

## 運用メモ

- v1 は同時実行 1 ジョブのみ
- サーバー停止で `queued` / `running` が残った場合、次回ジョブ API アクセス時に `failed` へ回収
- 複数サーバー構成や共有ストレージ前提の運用は未対応
