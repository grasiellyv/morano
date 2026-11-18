"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive } from "@/components/layout/nav-active";
import { PRIMARY_NAV } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="Navegação principal"
      className="bg-background border-border fixed inset-x-0 bottom-0 z-40 border-t pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-0 outline-none focus-visible:ring-2 focus-visible:ring-inset",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" />
                <span className="text-[11px] leading-none font-medium tracking-tight">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
