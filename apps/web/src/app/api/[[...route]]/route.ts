/**
 * Next.js の Route Handler。/api 以下のすべてのリクエストを Hono に渡す。
 *
 * 実際のルーティングは src/server/api.ts に書いてある。
 */
import { handle } from "hono/vercel";
import { api } from "@/server/api";

export const GET = handle(api);
export const POST = handle(api);
