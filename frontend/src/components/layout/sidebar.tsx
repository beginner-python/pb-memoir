import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ActiveNavLinks, NavLinks } from "./nav-links";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
      <Link href="/" className="flex items-center gap-2 px-2 text-sidebar-foreground">
        <BookOpen className="size-6 text-primary" aria-hidden />
        <span className="font-heading text-2xl tracking-tight">pb-memoir</span>
      </Link>
      <nav aria-label="メイン" className="mt-8 flex flex-col gap-1">
        <Suspense fallback={<NavLinks pathname={null} variant="sidebar" />}>
          <ActiveNavLinks variant="sidebar" />
        </Suspense>
      </nav>
    </aside>
  );
}
