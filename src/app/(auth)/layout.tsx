import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Logo size="lg" />
        <p className="text-muted-foreground text-sm">Dividir responsabilidades. Multiplicar o bem-estar.</p>
      </div>
      <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 sm:p-8">
        {children}
      </div>
    </main>
  );
}
