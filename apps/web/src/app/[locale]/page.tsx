/**
 * トップページ。ログイン画面へ転送する。
 */
import { redirect } from "next/navigation";

/**
 * @param props.params - URL の言語
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/login`);
}
