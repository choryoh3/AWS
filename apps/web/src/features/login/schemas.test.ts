import { describe, expect, it } from "vitest";
import { emailSchema, normalizeEmail, otpSchema } from "./schemas";

describe("メールアドレスの入力チェック", () => {
  it("正しい形式を受け付け、前後の空白を取り除く", () => {
    const result = emailSchema.safeParse("  user@example.com ");
    expect(result.success).toBe(true);
  });

  it("形式が違うものを拒否する", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("normalizeEmail は小文字にして空白を除く", () => {
    expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com");
  });
});

describe("認証コードの入力チェック", () => {
  it("6 桁の数字だけを受け付ける", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("12345a").success).toBe(false);
    expect(otpSchema.safeParse("1234567").success).toBe(false);
  });
});
