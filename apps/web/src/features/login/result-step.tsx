"use client";

/**
 * ④ ログイン結果（OK / NG）の画面。
 */
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AuthErrorCode } from "./use-login";
import { useSignOutMutation } from "./use-login";

/** 結果の種類。OK はメール、NG は失敗の理由を持つ。 */
export type Outcome =
  { kind: "ok"; email: string } | { kind: "ng"; email: string; reason: AuthErrorCode };

/**
 * @param props.outcome - 表示する結果
 * @param props.onLogout - OK 画面で「ログアウト」したとき
 * @param props.onRetryCode - NG 画面で「コードを入力し直す」を押したとき（コードの再入力が可能な失敗のみ）
 * @param props.onRestart - NG 画面で「最初からやり直す」を押したとき
 */
export function ResultStep({
  outcome,
  onLogout,
  onRetryCode,
  onRestart,
}: {
  outcome: Outcome;
  onLogout?: () => void;
  onRetryCode?: () => void;
  onRestart?: () => void;
}) {
  const t = useTranslations("login");
  const signOut = useSignOutMutation();

  if (outcome.kind === "ok") {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-2xl font-bold text-success">
          {t("ok.title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("ok.description", { email: outcome.email })}
        </p>
        <Button
          variant="outline"
          size="lg"
          disabled={signOut.isPending}
          onClick={() =>
            signOut.mutate(undefined, {
              onSuccess: () => onLogout?.(),
            })
          }
        >
          {t("ok.logout")}
        </Button>
      </div>
    );
  }

  // 入力し直せば解決しうる失敗（コードの誤り）だけ「コードを入力し直す」を出す。
  const canRetryCode = outcome.reason === "INVALID_OTP";

  return (
    <div className="flex flex-col gap-4">
      <p role="alert" className="text-2xl font-bold text-destructive">
        {t("ng.title")}
      </p>
      <p className="text-sm text-muted-foreground">{t(`ng.reasons.${outcome.reason}`)}</p>
      {canRetryCode && onRetryCode && (
        <Button size="lg" onClick={onRetryCode}>
          {t("ng.retryCode")}
        </Button>
      )}
      <Button variant="outline" size="lg" onClick={onRestart}>
        {t("ng.retry")}
      </Button>
    </div>
  );
}
