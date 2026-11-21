/**
 * ブラウザ側の Better Auth クライアント。
 *
 * - emailOtp.sendVerificationOtp … ② 認証コードを送る
 * - signIn.emailOtp              … ③④ コードを検証してログインする
 * - signOut                      … ログアウト
 *
 * baseURL を省略すると現在のオリジン（同じサイト）を使う。
 */
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [emailOTPClient()],
});
