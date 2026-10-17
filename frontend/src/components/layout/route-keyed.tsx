"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";

/**
 * Next.js 16 は遷移後も前のページを隠したまま保持する(入力欄やチャットの状態が残る)。
 * パス名を key にして、ページが変わるたびに中身を作り直し、各画面の状態をリセットする。
 * usePathname は URL 由来の値なので、呼び出し側で Suspense に包む。
 */
export function RouteKeyed({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <Fragment key={pathname}>{children}</Fragment>;
}
