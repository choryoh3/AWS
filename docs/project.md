# プロジェクト設定

全エージェントとコマンドが最初に読む設定ファイル。`/init-project` で作成・更新する。
不要な項目は削除せず「なし」と書く（`scripts/validate_docs.py` が存在を検証する）。

## 基本

- プロジェクト名: aws-app（汎用ログイン）
- 種別: web-ui
- 一言説明: メールに届く 6 桁の認証コードでログインする汎用ログイン画面（Next.js App Router + Hono + Better Auth）

## 実行と検証

- 起動コマンド: `pnpm dev`（事前に `docs/setup.md` の手順で .env.local・DB・Mailpit を用意する）
- URL: http://localhost:3000/ja/login（web-ui のとき）
- 停止方法: 起動したターミナルで Ctrl+C。ポート 3000 を使う
- 検証コマンド: `pnpm test`
- 静的検査コマンド: `pnpm typecheck && pnpm lint`
- ビルドコマンド: `pnpm build`
- 初期データ・準備: `pnpm --filter @app/db db:migrate`（テーブル作成）。Mailpit（SMTP 1025 / 画面 8025）を起動しておく

## 評価

- UI評価: あり
- デザイン資料: docs/design/tokens.md
- 評価上の注意: 現時点の実装は、planner / generator / designer / evaluator の工程を経ていない（メインセッションが直接実装し、Playwright で「メール入力 → コード受信（Mailpit）→ NG → 再入力 → OK → 再読み込みでも維持 → ログアウト」を通し確認した）。`docs/design/tokens.md` は未整備のため、デザイン採点の基準はまだ無い。正式な評価には、トークンを整えたうえで `/sprint` を回すこと。

## ハーネス設定（任意・既定値を変えるときだけ）

「契約で許可する語」には、契約に書いてよい実装寄りの語をカンマ区切りで書く（例: エンドポイント設計, useState）。

- 機能数: 2-4
- 契約項目数: 5-15
- 契約で許可する語: なし

## 使用 MCP

- playwright: web-ui の評価・デザイン確認（evaluator / designer）
- context7: ライブラリの最新ドキュメント確認（generator）。現在は接続できない（プロキシ拒否）
- serena: 既存コードのシンボル単位の探索・編集（generator、メインセッション）。`.serena/project.yml` の `language_servers` は typescript に設定済み
