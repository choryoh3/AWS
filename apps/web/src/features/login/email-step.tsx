"use client";

/**
 * ① メールアドレス入力 → ② 認証コードの送信。
 */
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailSchema, normalizeEmail } from "./schemas";
import { useSendCodeMutation } from "./use-login";

/**
 * @param props.onSent - 送信に成功したとき、送った先のメールアドレスを渡す
 */
export function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const send = useSendCodeMutation();

  /**
   * フォーム送信時の処理。形式を確かめてから、コード送信の API を呼ぶ。
   *
   * @param event - フォームの送信イベント
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setValidationError(t("errors.invalidEmail"));
      return;
    }
    setValidationError(null);
    const normalized = normalizeEmail(parsed.data);
    send.mutate(normalized, {
      onSuccess: () => onSent(normalized),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">{t("email.label")}</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t("email.placeholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={validationError ? true : undefined}
          aria-describedby={validationError ? "login-email-error" : undefined}
          disabled={send.isPending}
          required
        />
        {validationError && (
          <p id="login-email-error" role="alert" className="text-sm text-destructive">
            {validationError}
          </p>
        )}
      </div>

      {send.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("errors.sendFailed")}
        </p>
      )}

      <Button type="submit" size="lg" disabled={send.isPending}>
        {send.isPending ? "…" : t("email.submit")}
      </Button>
    </form>
  );
}
