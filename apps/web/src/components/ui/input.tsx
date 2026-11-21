/**
 * 入力欄（shadcn/ui と同じ見た目・使い方）。
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * @param props - 通常の input 要素の属性
 */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
