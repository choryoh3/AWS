import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginFlow } from "./login-flow";

/*
 * ログイン画面の状態遷移を確かめるテスト。
 * 通信（Better Auth・/api/me）はモックに置き換え、画面の流れだけを見る。
 */

const sendVerificationOtp = vi.fn();
const signInEmailOtp = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    emailOtp: { sendVerificationOtp: (...args: unknown[]) => sendVerificationOtp(...args) },
    signIn: { emailOtp: (...args: unknown[]) => signInEmailOtp(...args) },
    signOut: (...args: unknown[]) => signOut(...args),
  },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: () => ({
    me: {
      $get: async () => ({ ok: true, status: 200, json: async () => ({ user: null }) }),
    },
  }),
}));

// 文言は「キー」をそのまま表示するモックにして、テストを文言の変更に強くする。
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

/** テストごとに新しい QueryClient を作って描画する。 */
function renderFlow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LoginFlow />
    </QueryClientProvider>,
  );
}

describe("LoginFlow（ログインの流れ）", () => {
  beforeEach(() => {
    sendVerificationOtp.mockReset();
    signInEmailOtp.mockReset();
    signOut.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("メール入力 → コード送信 → コード入力 → 誤りでNG → 入力し直しまで進む", async () => {
    sendVerificationOtp.mockResolvedValue({ data: { success: true }, error: null });
    signInEmailOtp.mockResolvedValue({
      data: null,
      error: { code: "INVALID_OTP", message: "bad", status: 400 },
    });

    renderFlow();

    // ① メールアドレス入力
    fireEvent.change(await screen.findByLabelText("email.label"), {
      target: { value: "User@Example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "email.submit" }));

    // ② 送信された（小文字に正規化され、sign-in 種別で送られる）
    await waitFor(() =>
      expect(sendVerificationOtp).toHaveBeenCalledWith({
        email: "user@example.com",
        type: "sign-in",
      }),
    );

    // ③ コード入力
    fireEvent.change(await screen.findByLabelText("otp.label"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "otp.submit" }));

    // ④ 誤りなので NG 画面
    expect(await screen.findByText("ng.title")).toBeTruthy();
    expect(signInEmailOtp).toHaveBeenCalledWith({ email: "user@example.com", otp: "123456" });

    // NG からコードを入力し直せる
    fireEvent.click(screen.getByRole("button", { name: "ng.retryCode" }));
    expect(await screen.findByLabelText("otp.label")).toBeTruthy();
  });

  it("コードが正しければ OK 画面になる", async () => {
    sendVerificationOtp.mockResolvedValue({ data: { success: true }, error: null });
    signInEmailOtp.mockResolvedValue({
      data: { user: { id: "1", email: "user@example.com" } },
      error: null,
    });

    renderFlow();

    fireEvent.change(await screen.findByLabelText("email.label"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "email.submit" }));

    fireEvent.change(await screen.findByLabelText("otp.label"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "otp.submit" }));

    expect(await screen.findByText("ok.title")).toBeTruthy();
  });

  it("6 桁でないコードは送信せず、エラーを出す", async () => {
    renderFlow();

    fireEvent.change(await screen.findByLabelText("email.label"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "email.submit" }));
    sendVerificationOtp.mockResolvedValue({ data: { success: true }, error: null });

    fireEvent.change(await screen.findByLabelText("otp.label"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "otp.submit" }));

    expect(await screen.findByText("errors.otpFormat")).toBeTruthy();
    expect(signInEmailOtp).not.toHaveBeenCalled();
  });
});
