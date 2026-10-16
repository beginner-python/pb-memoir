import { Suspense } from "react";

import { ActiveNavLinks, NavLinks } from "./nav-links";

export function BottomNav() {
  return (
    <nav
      aria-label="メイン"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-sidebar-border bg-sidebar/95 backdrop-blur md:hidden"
    >
      <Suspense fallback={<NavLinks pathname={null} variant="bottom" />}>
        <ActiveNavLinks variant="bottom" />
      </Suspense>
    </nav>
  );
}
