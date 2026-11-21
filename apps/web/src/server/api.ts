/**
 * Hono の API 本体（Next.js の Route Handler に同居させる）。
 *
 * 公開 URL:
 * - /api/health       … 生存確認
 * - /api/me           … 今のログイン状態（TanStack Query から呼ぶ）
 * - /api/auth/*       … Better Auth（OTP の送信・検証・ログアウトなど）
 *
 * `ApiType` を型として書き出し、ブラウザ側の hc クライアントで型安全に呼ぶ。
 */
import { Hono } from "hono";
import { auth } from "./auth";

/** Hono アプリ。basePath を /api にして Next.js の Route Handler と揃える。 */
export const api = new Hono()
  .basePath("/api")
  .get("/health", (c) => c.json({ ok: true as const }))
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .get("/me", async (c) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!result) {
      return c.json({ user: null });
    }
    return c.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });
  });

/** クライアント（hc）が型を読むための型定義。 */
export type ApiType = typeof api;
