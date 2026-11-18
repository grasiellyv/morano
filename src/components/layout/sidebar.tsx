"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { isNavItemActive } from "@/components/layout/nav-active";
import { PRIMARY_NAV, SETTINGS_NAV } from "@/components/layout/nav-items";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { cn } from "@/lib/utils";

const rowClass =
  "focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-2";

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const settingsActive = isNavItemActive(pathname, SETTINGS_NAV.href);
  const SettingsIcon = SETTINGS_NAV.icon;
  return (
    <div className="bg-background border-border fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r py-6 pr-4 pl-[max(1rem,env(safe-area-inset-left))] md:flex">
      <Link
        href="/inicio"
        aria-label="MORANO, ir para Início"
        className="focus-visible:ring-ring mb-8 self-start rounded-md px-3 outline-none focus-visible:ring-2"
      >
        <Logo size="md" />
      </Link>
      <nav aria-label="Navegação principal" className="flex flex-1 flex-col">
        <ul className="space-y-1">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isNavItemActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    rowClass,
                    active ? "bg-sand text-foreground" : "text-muted-foreground hover:bg-sand/60",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto space-y-1">
          <Link
            href={SETTINGS_NAV.href}
            aria-current={settingsActive ? "page" : undefined}
            className={cn(
              rowClass,
              settingsActive ? "bg-sand text-foreground" : "text-muted-foreground hover:bg-sand/60",
            )}
          >
            <SettingsIcon aria-hidden className="size-5" />
            {SETTINGS_NAV.label}
          </Link>
          <SignOutButton />
        </div>
      </nav>
    </div>
  );
}
