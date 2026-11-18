import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background min-h-dvh px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <header className="mx-auto mb-8 flex w-full max-w-2xl items-center">
        <Link
          href="/"
          aria-label="MORANO, ir para o início"
          className="focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-2"
        >
          <Logo size="md" />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl">{children}</main>
    </div>
  );
}
