"use client";

/**
 * クライアント側の共通プロバイダー。TanStack Query のキャッシュを全体に渡す。
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * @param props.children - 子要素
 */
export function Providers({ children }: { children: ReactNode }) {
  // コンポーネントごとに 1 回だけ作る（再描画のたびに作り直さないため）。
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 認証状態は頻繁に変わらないので、1 分間は再取得しない。
            staleTime: 60_000,
            // 認証エラーの再試行は意味がないので 1 回に抑える。
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
