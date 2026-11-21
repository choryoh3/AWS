/**
 * ログイン画面の入力チェック（zod）。
 *
 * 画面に出す文言は持たず、「合格か不合格か」だけを返す。
 * 文言は呼び出し側で t("errors.…") から選ぶ。
 */
import { z } from "zod";

/** メールアドレスの形式チェック。前後の空白を取り除いてから判定する。 */
export const emailSchema = z.string().trim().pipe(z.email());

/** 認証コードは 6 桁の数字だけを受け付ける。 */
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/);

/**
 * メールアドレスを正規化する（前後の空白除去・小文字化）。
 * サーバー側も小文字で扱うので、送信前にそろえておく。
 *
 * @param input - 入力されたメールアドレス
 * @returns 正規化したメールアドレス
 */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}
