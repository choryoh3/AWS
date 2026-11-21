/**
 * Next.js 16 の proxy（旧 middleware）。言語のプレフィックス（/ja, /en）を決めて振り分ける。
 *
 * API（/api）と静的ファイルは対象外にしている。
 */
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
