"use client";

/**
 * ログイン画面の全体。3 つのステップと結果画面を切り替える。
 *
 * ① メールアドレス入力 → ② 認証コード送信 → ③ コード入力 → ④ ログイン OK / NG
 *
 * 画面の状態（Step）は 1 か所で管理し、どの画面にいるかが一目で分かるようにしている。
 */
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailStep } from "./email-step";
import { OtpStep } from "./otp-step";
import { ResultStep } from "./result-step";
import type { AuthErrorCode } from "./use-login";
import { useMeQuery } from "./use-login";

/**
 * 画面の状態。kind で今どの画面かを表す。
 * - email … ① メール入力
 * - otp   … ③ コード入力（email は送信先）
 * - ok    … ④ ログイン成功（email は表示用）
 * - ng    … ④ ログイン失敗（reason は失敗の理由、email は再入力に使う）
 */
type Step =
  | { kind: "email" }
  | { kind: "otp"; email: string }
  | { kind: "ok"; email: string }
  | { kind: "ng"; email: string; reason: AuthErrorCode };

/**
 * ログインフロー本体。すでにログイン中なら、最初から OK 画面を出す。
 */
export function LoginFlow() {
  const t = useTranslations("login");
  const me = useMeQuery();
  const [step, setStep] = useState<Step>({ kind: "email" });

  // すでにログイン中（セッションがある）なら、①〜③を飛ばして OK 画面にする。
  const view: Step = step.kind === "email" && me.data ? { kind: "ok", email: me.data.email } : step;

  const stepIndex = view.kind === "email" ? 0 : view.kind === "otp" ? 1 : 2;
  const stepLabels = [t("steps.email"), t("steps.otp"), t("steps.result")];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <ol className="flex gap-2 text-xs text-muted-foreground" aria-label="進捗">
        {stepLabels.map((label, index) => (
          <li
            key={label}
            aria-current={index === stepIndex ? "step" : undefined}
            className={index <= stepIndex ? "font-semibold text-foreground" : undefined}
          >
            {index + 1}. {label}
            {index < stepLabels.length - 1 ? " /" : ""}
          </li>
        ))}
      </ol>

      <CardContent>
        {view.kind === "email" && <EmailStep onSent={(email) => setStep({ kind: "otp", email })} />}

        {view.kind === "otp" && (
          <OtpStep
            email={view.email}
            onVerified={(email) => setStep({ kind: "ok", email })}
            onFailed={(reason) => setStep({ kind: "ng", email: view.email, reason })}
            onChangeEmail={() => setStep({ kind: "email" })}
          />
        )}

        {view.kind === "ok" && (
          <ResultStep
            outcome={{ kind: "ok", email: view.email }}
            onLogout={() => setStep({ kind: "email" })}
          />
        )}

        {view.kind === "ng" && (
          <ResultStep
            outcome={{ kind: "ng", reason: view.reason, email: view.email }}
            onRetryCode={() => setStep({ kind: "otp", email: view.email })}
            onRestart={() => setStep({ kind: "email" })}
          />
        )}
      </CardContent>
    </Card>
  );
}
