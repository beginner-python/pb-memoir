import { Suspense } from "react";

import { ChatPage } from "@/components/chat/chat-page";

// useSearchParams を使うクライアントコンポーネントは Suspense で包む(Next.js 16 の要件)
export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">読み込み中…</p>}>
      <ChatPage />
    </Suspense>
  );
}
