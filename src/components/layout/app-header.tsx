import Link from "next/link";
import { User } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-between pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] md:hidden">
      <Logo size="sm" />
      <Link
        href="/configuracoes"
        aria-label="Configurações"
        className="focus-visible:ring-ring -mr-2 flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2"
      >
        <span className="bg-sand text-foreground flex size-8 items-center justify-center rounded-full">
          <User aria-hidden className="size-4" />
        </span>
      </Link>
    </header>
  );
}
