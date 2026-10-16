"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { NAV_ITEMS, isActive } from "./nav-items";

type Variant = "sidebar" | "bottom";

/** ナビの描画。pathname が null のときは全項目を非アクティブで描く(Suspense のフォールバック用) */
export function NavLinks({ pathname, variant }: { pathname: string | null; variant: Variant }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = pathname !== null && isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              variant === "sidebar"
                ? cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )
                : cn(
                    "flex flex-col items-center gap-1 py-2.5 text-xs",
                    active ? "text-primary font-medium" : "text-muted-foreground",
                  )
            }
          >
            <item.icon className={variant === "sidebar" ? "size-4.5" : "size-5"} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/** usePathname は URL 由来の値なので、呼び出し側で Suspense に包む */
export function ActiveNavLinks({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} variant={variant} />;
}
