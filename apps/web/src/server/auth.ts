/**
 * Better Auth の設定（サーバー側専用）。
 *
 * ログイン方式は「メールに届く 6 桁の認証コード（OTP）」だけ。パスワードは使わない。
 * 流れ: ① メール入力 → ② sendVerificationOTP でコードを送信 → ③ コード入力で検証 → ④ セッション発行。
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db, schema } from "@app/db";
import { getEnv } from "@/lib/env";
import { sendOtpMail } from "@/lib/mailer";

/** 認証コードの有効期間（秒）。 */
const OTP_EXPIRES_IN_SECONDS = 60 * 5;

const env = getEnv();

/**
 * 認証のインスタンス。Route Handler（src/server/api.ts）から呼ばれる。
 *
 * - `disableSignUp` が true のとき、未登録のメールには実際には送信されず、
 *   検証も失敗する（アカウントの有無を外部に漏らさないため、応答は常に成功に見える）。
 * - コードは DB に「ハッシュ化して」保存される。平文は送信時にだけ存在する。
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: false },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_EXPIRES_IN_SECONDS,
      allowedAttempts: 3,
      storeOTP: "hashed",
      disableSignUp: !env.AUTH_ALLOW_SIGNUP,
      /**
       * コードをメールで送る。このアプリはログインだけを扱うので、
       * 種類が "sign-in" 以外（メール変更など）は送らない。
       */
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") return;
        await sendOtpMail({
          to: email,
          otp,
          expiresInMinutes: OTP_EXPIRES_IN_SECONDS / 60,
        });
      },
    }),
  ],
});

/** 認証の型（セッションや利用者の型を他のファイルで使うため）。 */
export type Auth = typeof auth;
