/**
 * クラス名を結合する小さな補助関数（shadcn/ui と同じ作法）。
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 条件付きのクラス名を結合し、Tailwind の競合（p-2 と p-4 など）を解消する。
 *
 * @param inputs - クラス名（文字列・条件オブジェクトなど）
 * @returns 結合済みのクラス名
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
