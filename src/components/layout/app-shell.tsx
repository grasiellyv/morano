import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="md:pl-60">
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(56px+env(safe-area-inset-bottom)+1.5rem)] md:px-10 md:py-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
