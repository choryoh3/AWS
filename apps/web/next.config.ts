import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/** next-intl に、文言を読み込む設定ファイルの場所を教える。 */
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Next.js の設定。最小限にして、挙動を予測しやすく保つ。
 * transpilePackages: 共有パッケージ（@app/db）は TypeScript のまま読み込むため指定する。
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@app/db"],
};

export default withNextIntl(nextConfig);
