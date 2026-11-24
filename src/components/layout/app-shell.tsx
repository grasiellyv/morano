import type { ReactNode } from "react";
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
        <main
          id="conteudo"
          tabIndex={-1}
          className="mx-auto w-full max-w-3xl pt-[calc(16px+env(safe-area-inset-top))] pr-[max(20px,env(safe-area-inset-right))] pb-[calc(100px+env(safe-area-inset-bottom))] pl-[max(20px,env(safe-area-inset-left))] outline-none md:px-10 md:py-10"
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
