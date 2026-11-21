import { describe, expect, it } from "vitest";
import { getTableName } from "drizzle-orm";
import { account, session, user, verification } from "./schema";

/**
 * Better Auth が前提とするテーブル名・カラムが揃っているかを確認するテスト。
 * テーブル名を変えると認証が動かなくなるため、変更時に気づけるようにする。
 */
describe("Better Auth 用のテーブル定義", () => {
  it("テーブル名が Better Auth の既定名と一致する", () => {
    expect(getTableName(user)).toBe("user");
    expect(getTableName(session)).toBe("session");
    expect(getTableName(account)).toBe("account");
    expect(getTableName(verification)).toBe("verification");
  });
});
