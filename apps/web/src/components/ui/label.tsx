/**
 * ラベル（shadcn/ui と同じ見た目・使い方）。
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * @param props - 通常の label 要素の属性
 */
export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm leading-none font-medium", className)} {...props} />;
}
