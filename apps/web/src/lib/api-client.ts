/**
 * Hono の型安全なクライアント（hc）を作る（ブラウザ側で使う）。
 *
 * 呼び出し例: `apiClient().me.$get()`。戻り値の型は ApiType から自動で決まる。
 */
import { hc } from "hono/client";
import type { ApiType } from "@/server/api";

/**
 * API クライアントを作る。
 * NEXT_PUBLIC_APP_URL が無ければ、今開いているページと同じオリジンを使う。
 *
 * @returns 型付きの Hono クライアント
 */
export function apiClient() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  return hc<ApiType>(base);
}
