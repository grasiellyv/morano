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
        left: "max(16px, env(safe-area-inset-left))",
        right: "max(16px, env(safe-area-inset-right))",
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        height: 60,
        borderRadius: 30,
        background: "var(--nav-bg)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 28px rgba(60,35,15,0.16)",
        padding: "0 6px",
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
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap no-underline"
              style={{
                height: 44,
                borderRadius: 22,
                background: "var(--nav-active)",
                color: "var(--nav-active-ink)",
                padding: "0 12px",
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              <Icon aria-hidden size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            // Os ícones inativos encolhem (44 → 36) antes de qualquer coisa vazar da pílula.
            className="flex items-center justify-center no-underline"
            style={{
              flex: "0 1 44px",
              minWidth: 36,
              height: 44,
              borderRadius: 22,
              background: "var(--nav-item)",
              color: "var(--foreground)",
            }}
          >
            <Icon aria-hidden size={18} strokeWidth={1.75} />
          </Link>
        );
      })}
    </nav>
  );
}
