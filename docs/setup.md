# セットアップ手順（ローカル開発）

このリポジトリは pnpm の monorepo です。

```
apps/web        Next.js (App Router) + Hono(Route Handler) + Better Auth + next-intl + TanStack Query
packages/db     Drizzle ORM（スキーマ・マイグレーション・接続）
docs/           仕様・設計・ハーネスのドキュメント
```

## 1. 必要なもの

| 項目       | 版（目安）                      | 用途                                                   |
| ---------- | ------------------------------- | ------------------------------------------------------ |
| Node.js    | 22 以上                         | 実行環境                                               |
| pnpm       | 10.x（`packageManager` で固定） | パッケージ管理                                         |
| PostgreSQL | 16                              | データベース（ローカルにインストール済みのものを使う） |
| Mailpit    | 最新                            | 開発用メール受信箱（SMTP 1025 / Web UI 8025）          |
| git / gh   | 最新                            | バージョン管理・GitHub 操作                            |

Mailpit のインストール例:

```bash
brew install mailpit        # macOS
mailpit                     # 起動（SMTP: localhost:1025 / 画面: http://localhost:8025）
```

## 2. データベースを用意する

```bash
psql -U postgres -c "CREATE USER app WITH PASSWORD 'app';"
psql -U postgres -c "CREATE DATABASE app OWNER app;"
```

## 3. 環境変数を設定する

```bash
cp apps/web/.env.example apps/web/.env.local
openssl rand -base64 32     # 出力を BETTER_AUTH_SECRET に貼る
```

`apps/web/.env.local` は Git に入らない（`.gitignore` で除外済み）。値の意味は `apps/web/.env.example` のコメントを参照。

## 4. 依存関係をインストールし、テーブルを作る

```bash
pnpm install
pnpm --filter @app/db db:migrate     # packages/db/drizzle の SQL を適用する
```

## 5. 起動する

```bash
pnpm dev                              # http://localhost:3000 （/ja/login でログイン画面）
```

## 6. 確認する

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

ログイン画面の流れ: メールアドレスを入力 → 認証コードが Mailpit（http://localhost:8025）に届く → コードを入力 → 「ログイン OK」または「ログイン NG」。

## 環境変数一覧

| 変数                      | 必須 | 例                                      | 説明                                                             |
| ------------------------- | ---- | --------------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`            | ○    | `postgres://app:app@localhost:5432/app` | PostgreSQL の接続先                                              |
| `BETTER_AUTH_SECRET`      | ○    | `openssl rand -base64 32` の出力        | 署名用の秘密の値（32 文字以上）                                  |
| `BETTER_AUTH_URL`         | ○    | `http://localhost:3000`                 | アプリの URL                                                     |
| `NEXT_PUBLIC_APP_URL`     | 任意 | `http://localhost:3000`                 | ブラウザ側の基準 URL（省略で同一オリジン）                       |
| `AUTH_ALLOW_SIGNUP`       | 任意 | `true`                                  | `true`: 初回ログイン時にアカウントを作る / `false`: 登録済みのみ |
| `SMTP_HOST`               | ○    | `localhost`                             | メール送信先のホスト                                             |
| `SMTP_PORT`               | 任意 | `1025`                                  | 既定 1025（Mailpit）。SES の STARTTLS は 587                     |
| `SMTP_SECURE`             | 任意 | `false`                                 | 465 番の直結暗号化なら `true`                                    |
| `SMTP_USER` / `SMTP_PASS` | 任意 | （SES の SMTP 認証情報）                | Mailpit は不要。SES は必要                                       |
| `MAIL_FROM`               | ○    | `Login <no-reply@example.com>`          | 送信元                                                           |

## Claude Code のクラウド環境で必要な設定

### Allowed domains（ネットワークの許可先）

| ホスト                                       | 必要か           | 理由                                                                                                                                                 |
| -------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registry.npmjs.org`                         | 既定で許可       | npm パッケージの取得（追加設定は不要）                                                                                                               |
| `ui.shadcn.com`                              | **推奨（追加）** | `pnpm dlx shadcn@latest add button` など、shadcn/ui の公式コンポーネントを取り込むため。現在は遮断されているので、今回の部品は同じ形で手書きしている |
| `proxy.golang.org`                           | 既定で許可       | Mailpit を `go install` で入れる場合のみ                                                                                                             |
| `github.com`                                 | 不要             | リリースのバイナリ取得は遮断されている。git の push は別経路                                                                                         |
| `fonts.googleapis.com` / `fonts.gstatic.com` | 不要             | `next/font/google` を使わないので、ビルド時の取得は発生しない                                                                                        |

本番（AWS）で必要な送信先: SES の SMTP `email-smtp.<リージョン>.amazonaws.com`（587 番）。アプリを動かす AWS 側の実行環境から届けば良く、Claude Code の環境には不要。

### 環境変数（クラウド環境に設定するもの）

- 公開しても差し支えないもの（`NEXT_PUBLIC_APP_URL`、`AUTH_ALLOW_SIGNUP`、`SMTP_HOST`、`SMTP_PORT`、`MAIL_FROM` など）は、環境変数として設定して構わない。
- **秘密の値（`BETTER_AUTH_SECRET`、`SMTP_PASS`、`DATABASE_URL` のパスワード部分）は、環境変数の平文欄に入れない。** 必要になったら、シークレット（Network secrets）として登録する。

## 注意

- 認証コードは開発中、Mailpit にだけ届く。実際のメールは送られない。
- 本番では、SES の「サンドボックス」を出るまで、送信先は検証済みのアドレスに限られる。
