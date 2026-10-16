"use client";

import { Suspense } from "react";

import { HealthProvider } from "@/hooks/use-health";

import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <HealthProvider>
      <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
        <Sidebar />
        <div className="flex min-w-0 flex-col">
          <main className="mx-auto w-full max-w-[960px] flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-12 md:pt-8">
            <AppHeader />
            <Suspense fallback={<p className="text-sm text-muted-foreground">読み込み中…</p>}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
      <BottomNav />
    </HealthProvider>
  );
}
