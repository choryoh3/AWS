/**
 * 多言語ルーティングの設定（next-intl）。
 *
 * 対応言語を増やすときは、ここの locales と messages/ の JSON を追加する。
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  /** 対応言語。 */
  locales: ["ja", "en"],
  /** 言語が指定されなかったときに使う言語。 */
  defaultLocale: "ja",
});

/** 対応言語の型（"ja" | "en"）。 */
export type Locale = (typeof routing.locales)[number];
