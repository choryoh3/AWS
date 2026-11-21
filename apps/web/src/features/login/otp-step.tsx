"use client";

/**
 * ③ 届いた認証コードの入力と検証。失敗・成功の結果は親（LoginFlow）に伝える。
 */
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeEmail, otpSchema } from "./schemas";
import {
  AuthFlowError,
  useSendCodeMutation,
  useVerifyCodeMutation,
  type AuthErrorCode,
} from "./use-login";

/**
 * @param props.email - コードを送った先のメールアドレス
 * @param props.onVerified - ログインに成功したとき
 * @param props.onFailed - ログインに失敗したとき（理由を渡す）
 * @param props.onChangeEmail - メールアドレスの入力に戻るとき
 */
export function OtpStep({
  email,
  onVerified,
  onFailed,
  onChangeEmail,
}: {
  email: string;
  onVerified: (email: string) => void;
  onFailed: (reason: AuthErrorCode) => void;
  onChangeEmail: () => void;
}) {
  const t = useTranslations("login");
  const [otp, setOtp] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const verify = useVerifyCodeMutation();
  const resend = useSendCodeMutation();

  /**
   * フォーム送信時の処理。6 桁かを確かめてから、コードを検証する。
   *
   * @param event - フォームの送信イベント
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) {
      setValidationError(t("errors.otpFormat"));
      return;
    }
    setValidationError(null);
    verify.mutate(
      { email: normalizeEmail(email), otp: parsed.data },
      {
        onSuccess: () => onVerified(email),
        onError: (error) => {
          // 想定内の失敗（AuthFlowError）はその code を、想定外の失敗は UNKNOWN を渡す。
          const reason: AuthErrorCode = error instanceof AuthFlowError ? error.code : "UNKNOWN";
          onFailed(reason);
        },
      },
    );
  };

  /** コードを送り直す。成功したら「送信しました」を表示する。 */
  const handleResend = () => {
    setResent(false);
    resend.mutate(normalizeEmail(email), {
      onSuccess: () => {
        setOtp("");
        setResent(true);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted-foreground">{t("otp.description", { email })}</p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-otp">{t("otp.label")}</Label>
        <Input
          id="login-otp"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="\d{6}"
          className="text-center text-lg tracking-[0.5em]"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
          aria-invalid={validationError ? true : undefined}
          disabled={verify.isPending}
          required
        />
        {validationError && (
          <p role="alert" className="text-sm text-destructive">
            {validationError}
          </p>
        )}
        {resent && !resend.isError && (
          <p role="status" className="text-sm text-success">
            {t("otp.sent")}
          </p>
        )}
        {resend.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t("errors.sendFailed")}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={verify.isPending}>
        {verify.isPending ? "…" : t("otp.submit")}
      </Button>

      <div className="flex justify-between text-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={resend.isPending}
        >
          {t("otp.resend")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onChangeEmail}>
          {t("otp.changeEmail")}
        </Button>
      </div>
    </form>
  );
}
