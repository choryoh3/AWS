import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Vitest の設定。ブラウザ風の環境（jsdom）で、画面コンポーネントもテストできる。
 * `@/` のパスは tsconfig の paths を読んで解決する。
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
