/**
 * 環境変数の読み込みと検証（サーバー側専用）。
 *
 * 起動時に zod で一度だけ検証し、足りない・形式が違う値があれば
 * 「どの変数が何で困っているか」をそのまま例外メッセージに出す。
 * 値そのものは絶対にログやエラーに出さない。
 */
import { z } from "zod";

/** "true" / "false" の文字列を真偽値に変換するスキーマ。既定値は引数で決める。 */
const boolFromString = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? defaultValue : value === "true"));

/**
 * アプリが必要とする環境変数の定義。
 * 追加・変更したら .env.example も一緒に更新すること。
 */
const envSchema = z.object({
  /** PostgreSQL の接続文字列。 */
  DATABASE_URL: z.string().min(1, "DATABASE_URL が空です"),
  /** Better Auth が署名・暗号化に使う秘密の値。32 文字以上の乱数にする。 */
  BETTER_AUTH_SECRET: z
    .string()
    .min(
      32,
      "BETTER_AUTH_SECRET は 32 文字以上にしてください（openssl rand -base64 32 で作れます）",
    ),
  /** アプリの公開 URL（認証の戻り先・Cookie の判定に使う）。 */
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL は http(s):// から始まる URL にしてください"),
  /** ブラウザから API を呼ぶときの基準 URL。省略すると現在のオリジンを使う。 */
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  /** 未登録のメールアドレスでも、初回ログイン時にアカウントを作るかどうか。 */
  AUTH_ALLOW_SIGNUP: boolFromString(true),
  /** メール送信（SMTP）の接続先。開発では Mailpit、本番では Amazon SES などを指定する。 */
  SMTP_HOST: z.string().min(1, "SMTP_HOST が空です"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  /** 465 番などの暗号化直結なら true。587 番の STARTTLS は false のままでよい。 */
  SMTP_SECURE: boolFromString(false),
  /** SMTP の認証情報。Mailpit のように認証が不要なら空でよい。 */
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** 送信元の表示名とアドレス（例: "Login <no-reply@example.com>"）。 */
  MAIL_FROM: z.string().min(1, "MAIL_FROM が空です"),
});

/** 検証済みの環境変数の型。 */
export type Env = z.infer<typeof envSchema>;

/**
 * 与えられた環境変数の集まりを検証して Env を返す。
 *
 * @param source - 検証する環境変数（通常は process.env）
 * @returns 検証済みの環境変数
 * @throws 必須項目が無い・形式が違うとき、変数名つきのエラー
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `環境変数の設定に問題があります。apps/web/.env.local を確認してください。\n${details}`,
    );
  }
  return result.data;
}

/** 一度検証した結果を使い回すための変数。 */
let cached: Env | undefined;

/**
 * 検証済みの環境変数を取得する（初回のみ検証し、以後は同じ値を返す）。
 *
 * @returns 検証済みの環境変数
 */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
