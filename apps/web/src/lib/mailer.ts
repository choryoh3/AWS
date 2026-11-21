/**
 * メール送信（SMTP）のラッパー。サーバー側専用。
 *
 * 開発では Mailpit（認証不要の SMTP 受信箱）へ、本番では Amazon SES の SMTP エンドポイントへ送る。
 * 接続先は環境変数だけで切り替えるので、コードは変えなくてよい。
 */
import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "./env";

/** 送信に使う Transporter を一度だけ作って使い回す。 */
let transporter: Transporter | undefined;

/**
 * SMTP の Transporter を取得する（初回のみ作成）。
 *
 * @returns nodemailer の Transporter
 */
function getTransporter(): Transporter {
  if (!transporter) {
    const env = getEnv();
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      // 認証情報が無い場合（Mailpit など）は auth を渡さない。
      auth:
        env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

/**
 * ログイン用の認証コードをメールで送る。
 *
 * @param params.to - 宛先のメールアドレス
 * @param params.otp - 送る認証コード（平文。メールにだけ含め、DB には保存しない）
 * @param params.expiresInMinutes - 有効期限（分）。本文に表示する
 */
export async function sendOtpMail(params: {
  to: string;
  otp: string;
  expiresInMinutes: number;
}): Promise<void> {
  const { to, otp, expiresInMinutes } = params;
  await getTransporter().sendMail({
    from: getEnv().MAIL_FROM,
    to,
    subject: `認証コード / Verification code: ${otp}`,
    text: [
      `認証コード: ${otp}`,
      `有効期限: ${expiresInMinutes} 分`,
      "心当たりがない場合は、このメールを無視してください。",
      "",
      `Verification code: ${otp}`,
      `Expires in: ${expiresInMinutes} minutes`,
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
  });
}
