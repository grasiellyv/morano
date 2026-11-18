import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="bg-background text-foreground focus-visible:ring-ring sr-only z-50 rounded-lg px-4 py-3 text-sm font-medium outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-2"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="md:pl-60">
        <AppHeader />
        <main
          id="conteudo"
          tabIndex={-1}
          className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(56px+env(safe-area-inset-bottom)+1.5rem)] outline-none md:px-10 md:py-10"
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
