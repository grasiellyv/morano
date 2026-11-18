import type { ReactNode } from "react";

export function PreliminaryNotice() {
  return (
    <p
      role="note"
      className="border-caramel bg-sand/60 text-foreground mb-8 rounded-lg border-l-4 px-4 py-3 text-sm font-medium"
    >
      Versão preliminar — o texto definitivo será publicado antes do lançamento.
    </p>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 py-4">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <div className="text-foreground space-y-3 text-sm leading-6 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
