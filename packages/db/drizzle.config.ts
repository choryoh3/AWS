import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// 接続先は apps/web/.env.local の DATABASE_URL を使う（環境変数を一箇所に集めるため）。
config({ path: "../../apps/web/.env.local" });

/**
 * drizzle-kit の設定。`pnpm --filter @app/db db:generate` で SQL を作り、
 * `pnpm --filter @app/db db:migrate` で DB に反映する。
 */
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
