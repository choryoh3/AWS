/**
 * カード（shadcn/ui と同じ見た目・使い方）。見出し・本文・フッターを並べて使う。
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** カードの外枠。 */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col gap-6 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

/** カードの見出し部分。 */
export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

/** カードのタイトル。 */
export function CardTitle({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cn("text-xl leading-tight font-semibold", className)} {...props} />;
}

/** カードの説明文。 */
export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** カードの本文。 */
export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}
