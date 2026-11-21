/**
 * ログインページ。画面の中身は LoginFlow（クライアント側）が担当する。
 */
import { setRequestLocale } from "next-intl/server";
import { LoginFlow } from "@/features/login/login-flow";

/**
 * @param props.params - URL の言語
 */
export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <LoginFlow />
    </main>
  );
}
