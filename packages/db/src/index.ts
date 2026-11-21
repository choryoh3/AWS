/**
 * DB 接続のエントリポイント。
 *
 * アプリ側（apps/web）はここから `db` と `schema` を import する。
 * 接続は 1 回だけ作り、使い回す（Next.js の開発中の再読み込みでも増えないようにする）。
 */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { schema } from "./schema";

export { schema };
export * from "./schema";

/** 型付きの Drizzle インスタンス。 */
export type Database = NodePgDatabase<typeof schema>;

/** 開発中のホットリロードで接続が増えないよう、グローバルに保持する。 */
const globalForDb = globalThis as unknown as { __pgPool?: pg.Pool };

/**
 * 接続プールを作る（既にあれば再利用する）。
 *
 * @param connectionString - PostgreSQL の接続文字列（例: postgres://app:app@localhost:5432/app）
 * @returns 接続プール
 */
function getPool(connectionString: string): pg.Pool {
  if (!globalForDb.__pgPool) {
    globalForDb.__pgPool = new pg.Pool({ connectionString });
  }
  return globalForDb.__pgPool;
}

/**
 * 環境変数 DATABASE_URL から Drizzle のインスタンスを作る。
 *
 * @throws DATABASE_URL が未設定のとき
 */
export function createDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL が設定されていません（apps/web/.env.local を確認してください）");
  }
  return drizzle(getPool(url), { schema });
}

/** アプリ全体で共有する DB インスタンス。 */
export const db: Database = createDb();
