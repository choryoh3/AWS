import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

/** テスト用の、正しい環境変数の一式。 */
const valid = {
  DATABASE_URL: "postgres://app:app@localhost:5432/app",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  SMTP_HOST: "localhost",
  MAIL_FROM: "Login <no-reply@example.com>",
};

describe("parseEnv", () => {
  it("正しい値を受け取り、既定値を補う", () => {
    const env = parseEnv(valid);
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.SMTP_SECURE).toBe(false);
    expect(env.AUTH_ALLOW_SIGNUP).toBe(true);
  });

  it("文字列の true / false を真偽値にする", () => {
    const env = parseEnv({ ...valid, AUTH_ALLOW_SIGNUP: "false", SMTP_SECURE: "true" });
    expect(env.AUTH_ALLOW_SIGNUP).toBe(false);
    expect(env.SMTP_SECURE).toBe(true);
  });

  it("秘密の値が短すぎるとき、変数名つきで失敗する", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("必須の値が無いとき、失敗する", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });
});
