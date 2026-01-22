# Next.jsアプリをDeno Deployにデプロイする指示書

## 目的
Cloudflareからの移行を含め、Next.jsサイトマップ生成ツールをDeno Deployに丸ごとデプロイする。

---

## 前提条件
- Next.jsプロジェクトが完成していること
- GitHubアカウントを持っていること
- Deno Deployアカウント（無料、GitHubで作成可能）

---

## Step 1: Cloudflare関連ファイルのクリーンアップ

### 1-1. 削除すべきファイル・ディレクトリ

プロジェクトルートで以下のファイルを確認して削除してください：

```bash
# Cloudflare Pages関連
.cloudflare/
wrangler.toml

# Cloudflare Workers関連
workers-site/
```

### 1-2. package.jsonの確認

`package.json`を開いて、Cloudflare関連のスクリプトや依存関係を削除：

**削除対象の例：**
```json
{
  "scripts": {
    "deploy:cloudflare": "...",  // 削除
    "preview:cloudflare": "..."  // 削除
  },
  "dependencies": {
    "@cloudflare/kv-asset-handler": "...",  // 削除（もしあれば）
    "wrangler": "..."  // 削除（もしあれば）
  }
}
```

削除後、依存関係を再インストール：
```bash
npm install
```

### 1-3. .gitignoreの確認

`.gitignore`ファイルに以下が含まれていることを確認（なければ追加）：

```gitignore
# Cloudflare
.cloudflare
wrangler.toml

# Deno Deploy
deno.json
deno.lock
```

---

## Step 2: Next.jsの設定確認

### 2-1. next.config.jsの設定

`next.config.js`（または`next.config.mjs`）を開いて、Cloudflare固有の設定を削除し、Deno Deploy用の設定に変更：

**削除すべき設定例：**
```javascript
// ❌ Cloudflare Pages用の設定（削除）
const nextConfig = {
  output: 'export',  // 静的エクスポート設定は削除
  // その他Cloudflare固有の設定
};
```

**推奨設定：**
```javascript
// ✅ Deno Deploy用の設定
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // これを追加（推奨）
  // または何も指定しない（デフォルト）
};

module.exports = nextConfig;
```

> **注意**: `output: 'standalone'`は必須ではありませんが、デプロイサイズを最適化できるので推奨です。

### 2-2. TypeScript設定の確認（TypeScriptを使用している場合）

`tsconfig.json`でパスエイリアス`@/`が設定されていることを確認：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## Step 3: 環境変数の整理

### 3-1. .envファイルの確認

プロジェクトルートの`.env`または`.env.local`ファイルを確認：

```bash
# Cloudflare固有の環境変数を削除
# CLOUDFLARE_API_KEY=...  # 削除
# CLOUDFLARE_ACCOUNT_ID=... # 削除

# 必要な環境変数のみ残す
# 例：
# DATABASE_URL=...
# API_KEY=...
```

### 3-2. 環境変数をDeno Deployに登録（後で設定）

現時点では`.env`ファイルを確認するだけでOKです。
実際の環境変数はStep 6でDeno Deployのダッシュボードから設定します。

---

## Step 4: GitHubリポジトリの準備

### 4-1. 新規リポジトリの作成（まだ作成していない場合）

1. GitHubで新しいリポジトリを作成
2. ローカルで初期化してpush：

```bash
# プロジェクトルートで実行
git init -b main
git add .
git commit -m "Initial commit for Deno Deploy"
git remote add origin https://github.com/<username>/<repository>.git
git push -u origin main
```

### 4-2. 既存リポジトリの場合

変更をcommit & push：

```bash
git add .
git commit -m "Cleanup Cloudflare config and prepare for Deno Deploy"
git push origin main
```

---

## Step 5: Deno Deployへのデプロイ

### 5-1. Deno Deployアカウントの作成

1. https://dash.deno.com にアクセス
2. 「Sign up with GitHub」をクリック
3. GitHubアカウントで認証

### 5-2. プロジェクトの作成とデプロイ

**画面での操作手順：**

1. **Deno Deployダッシュボード**で「New Project」をクリック

2. **リポジトリの選択**
   - 「Import from GitHub」を選択
   - プロジェクトのリポジトリを検索して選択
   - Deno Deployが自動的にNext.jsを検知します

3. **ビルド設定の確認**
   - Deno Deployが自動的に以下を設定します：
     - Build Command: `npm run build`
     - Install Command: `npm install`
     - Entrypoint: `jsr:@deno/nextjs-start` (Next.js 14の場合)
       または `jsr:@deno/nextjs-start/v15` (Next.js 15の場合)
   
   > **自動検知**: Next.jsプロジェクトであることを自動認識し、適切な設定を行います

4. **デプロイブランチの選択**
   - デフォルトは`main`ブランチ
   - 必要に応じて変更

5. **「Deploy Project」をクリック**
   - Deno Deployがリポジトリに`.github/workflows/deploy.yml`を自動追加
   - 初回ビルド・デプロイが開始されます

### 5-3. デプロイの確認

デプロイが完了すると、以下のURLが発行されます：

```
https://<project-name>.deno.dev
```

ブラウザでアクセスして、アプリが正常に動作することを確認してください。

---

## Step 6: 環境変数の設定（必要な場合）

### 6-1. Deno Deployダッシュボードから設定

1. プロジェクトのダッシュボードを開く
2. 「Settings」タブをクリック
3. 「Environment Variables」セクションで変数を追加

**追加方法：**
```
Key: DATABASE_URL
Value: postgresql://...
```

4. 「Save」をクリック
5. 変更を反映させるために再デプロイ（自動で行われる場合もあります）

### 6-2. 環境変数の種類

- **Production**: 本番環境用
- **Preview**: プレビュー環境用（プルリクエスト時）

---

## Step 7: カスタムドメインの設定（オプション）

### 7-1. 独自ドメインを使用する場合

1. プロジェクトダッシュボードの「Settings」→「Domains」
2. 「Add Domain」をクリック
3. ドメイン名を入力（例: `sitemap.example.com`）
4. DNS設定の指示に従って、DNSレコードを追加：
   ```
   Type: CNAME
   Name: sitemap
   Value: cname.deno.dev
   ```
5. DNS設定完了後、数分〜数時間で反映

---

## Step 8: 継続的デプロイの確認

### 8-1. GitHub Actionsの自動設定

Deno Deployは初回デプロイ時に`.github/workflows/deploy.yml`を自動作成します。

**ファイルの場所：**
```
.github/
└── workflows/
    └── deploy.yml
```

**動作確認：**
1. GitHubリポジトリの「Actions」タブで確認
2. mainブランチへのpushで自動デプロイが実行される

### 8-2. プルリクエストのプレビュー

- プルリクエストを作成すると、自動でプレビュー環境が作成されます
- プレビューURLはプルリクエストのコメントに表示されます

---

## トラブルシューティング

### エラー1: ビルドが失敗する

**原因**: 依存関係の問題

**解決策**:
```bash
# ローカルで確認
npm install
npm run build

# 成功したらpush
git add .
git commit -m "Fix dependencies"
git push
```

### エラー2: API Routesが動作しない

**原因**: `output: 'export'`設定が残っている

**解決策**:
`next.config.js`から`output: 'export'`を削除するか、`output: 'standalone'`に変更

### エラー3: 環境変数が読み込まれない

**原因**: Deno Deployに環境変数が設定されていない

**解決策**:
Step 6を参照して、Deno Deployダッシュボードから環境変数を設定

### エラー4: モジュールが見つからない

**原因**: `@/`パスエイリアスの問題

**解決策**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### エラー5: サブリクエスト制限エラー

**原因**: もしかしたらまだCloudflareにデプロイされている

**解決策**:
- Deno DeployのURLでアクセスしているか確認
- Cloudflare Pagesプロジェクトを削除

---

## デプロイ後の確認項目チェックリスト

- [ ] トップページが表示される
- [ ] URLフォーム入力ができる
- [ ] クロール機能が動作する（サブリクエスト制限がない）
- [ ] Excel生成・ダウンロードができる
- [ ] Basic認証が機能する（設定している場合）
- [ ] 環境変数が正しく読み込まれている
- [ ] GitHub pushで自動デプロイされる

---

## CLI経由でのデプロイ（代替方法）

GitHubを使わず、CLIから直接デプロイすることも可能です。

### CLIのインストール

```bash
# deployctlのインストール
deno install -A --global jsr:@deno/deployctl
```

### デプロイコマンド

```bash
# プロジェクトルートで実行
npm run build

# Next.js 15の場合
deployctl deploy --include=.next --include=public jsr:@deno/nextjs-start/v15

# Next.js 14の場合
deployctl deploy --include=.next --include=public jsr:@deno/nextjs-start
```

初回実行時は認証URLが表示されるので、ブラウザで認証してください。

---

## Deno Deploy vs Cloudflare Pages 比較

| 項目 | Deno Deploy | Cloudflare Pages/Workers |
|-----|-------------|--------------------------|
| **サブリクエスト制限** | なし | 50回（無料）、1000回（有料） |
| **Next.js SSR** | ✅ 完全対応 | ⚠️ 制限あり |
| **料金** | 無料100万リクエスト/月 | 無料10万リクエスト/日 |
| **商用利用** | ✅ 無料プランでもOK | ✅ 無料プランでもOK |
| **デプロイ** | 自動検知、簡単 | 設定が複雑 |

---

## 料金プラン（参考）

### 無料プラン（Free Tier）
- **リクエスト**: 100万/月
- **帯域幅**: 100GB/月
- **カスタムドメイン**: 50個まで
- **商用利用**: ✅

### Proプラン（$20/月）
- **リクエスト**: 500万/月
- **帯域幅**: 250GB/月
- **CPUタイム**: 50ms/リクエスト
- **サポート**: メールサポート

無料プランで十分な場合がほとんどです。

---

## 次のステップ

デプロイ完了後、以下を検討：

1. **モニタリング**
   - Deno Deployダッシュボードでアクセス解析を確認

2. **パフォーマンス最適化**
   - 画像最適化（Next.js Image）
   - キャッシング戦略

3. **セキュリティ強化**
   - CORS設定
   - レート制限の実装

4. **機能追加**
   - robots.txt対応
   - sitemap.xml生成

---

## 参考リンク

- **Deno Deploy公式ドキュメント**: https://docs.deno.com/deploy/
- **Next.js on Deno Deploy**: https://deno.com/blog/nextjs-on-deno-deploy
- **Deno Deployダッシュボード**: https://dash.deno.com

---

**作成日**: 2025-01-20
**対象**: Cloudflare → Deno Deploy移行
**想定所要時間**: 30分〜1時間
