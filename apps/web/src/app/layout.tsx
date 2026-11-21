/**
 * ルートレイアウト。実際の <html> と <body> は言語ごとのレイアウト（[locale]/layout.tsx）で作る。
 * ここは子要素をそのまま返すだけの最小構成にしている。
 */
import type { ReactNode } from "react";
import "./globals.css";

/**
 * @param props.children - 子ページ
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
