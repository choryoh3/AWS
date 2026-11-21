"use client";

/**
 * ログインに関する TanStack Query のフック集。
 *
 * - useMeQuery           … 今のログイン状態を取得する（/api/me）
 * - useSendCodeMutation  … ② 認証コードを送る
 * - useVerifyCodeMutation… ③④ コードを検証してログインする
 * - useSignOutMutation   … ログアウトする
 *
 * Better Auth のクライアントは失敗を throw せず { error } で返すため、
 * ここで AuthFlowError に包み直して、画面側が code で分岐できるようにする。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

/** 画面が扱う失敗の種類。 */
export type AuthErrorCode = "INVALID_OTP" | "OTP_EXPIRED" | "TOO_MANY_ATTEMPTS" | "UNKNOWN";

/** 既知のコードだけを残し、それ以外は UNKNOWN にまとめる。 */
const KNOWN_CODES: readonly AuthErrorCode[] = ["INVALID_OTP", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS"];

/**
 * 認証の失敗を表す例外。code で画面の文言を選ぶ。
 */
export class AuthFlowError extends Error {
  /** 失敗の種類。 */
  readonly code: AuthErrorCode;

  /**
   * @param code - 失敗の種類
   * @param message - 技術的な詳細（画面には出さない）
   */
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AuthFlowError";
    this.code = code;
  }
}

/** 「ログイン状態」を取得するときのキー。他のフックからも参照する。 */
export const meQueryKey = ["me"] as const;

/**
 * 今のログイン状態を取得する。ログイン中なら { id, email, name }、そうでなければ null。
 */
export function useMeQuery() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async () => {
      // Hono の basePath（/api）がクライアントの経路にも現れるため、api を経由して呼ぶ。
      const res = await apiClient().api.me.$get();
      if (!res.ok) {
        throw new Error(`/api/me の応答が不正です（${res.status}）`);
      }
      const body = await res.json();
      return body.user;
    },
  });
}

/**
 * ② 認証コードを送るミューテーション。
 */
export function useSendCodeMutation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) {
        throw new AuthFlowError("UNKNOWN", error.message);
      }
    },
  });
}

/**
 * ③④ 認証コードを検証してログインするミューテーション。
 * 成功すると、ログイン状態のキャッシュを更新する。
 */
export function useVerifyCodeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; otp: string }) => {
      const { data, error } = await authClient.signIn.emailOtp({
        email: input.email,
        otp: input.otp,
      });
      if (error) {
        const code = KNOWN_CODES.find((known) => known === error.code) ?? "UNKNOWN";
        throw new AuthFlowError(code, error.message);
      }
      return data.user;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

/**
 * ログアウトするミューテーション。成功すると、ログイン状態を即座に「未ログイン」にする。
 */
export function useSignOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      queryClient.setQueryData(meQueryKey, null);
    },
  });
}
