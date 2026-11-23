"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive } from "@/components/layout/nav-active";
import { PRIMARY_NAV } from "@/components/layout/nav-items";

export function BottomNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed z-40 flex items-center justify-between md:hidden"
      style={{
        left: 20,
        right: 20,
        bottom: "calc(18px + env(safe-area-inset-bottom))",
        height: 64,
        borderRadius: 32,
        background: "var(--nav-bg)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 28px rgba(60,35,15,0.16)",
        padding: "0 8px",
      }}
    >
      {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
        const active = isNavItemActive(pathname, href);
        if (active) {
          return (
            <Link
              key={href}
              href={href}
              aria-current="page"
              className="flex shrink-0 items-center gap-[7px] no-underline"
              style={{
                height: 48,
                borderRadius: 24,
                background: "var(--nav-active)",
                color: "var(--nav-active-ink)",
                padding: "0 16px",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Icon aria-hidden size={19} strokeWidth={1.7} />
              <span>{label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="flex shrink-0 items-center justify-center no-underline"
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: "var(--nav-item)",
              color: "var(--foreground)",
            }}
          >
            <Icon aria-hidden size={19} strokeWidth={1.7} />
          </Link>
        );
      })}
    </nav>
  );
}
