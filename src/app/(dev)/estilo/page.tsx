import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { AppMark } from "@/components/brand/app-mark";
import { Logo } from "@/components/brand/logo";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoActions } from "./demo-actions";

export const metadata: Metadata = { title: "Estilo" };

const PALETTE = [
  { name: "offwhite", hex: "#F5F2EC", className: "bg-offwhite" },
  { name: "sand", hex: "#E7E0D5", className: "bg-sand" },
  { name: "graphite", hex: "#30332F", className: "bg-graphite" },
  { name: "sage", hex: "#879080", className: "bg-sage" },
  { name: "caramel", hex: "#B69B79", className: "bg-caramel" },
  { name: "sage-ink", hex: "#5A6155", className: "bg-sage-ink" },
  { name: "alert-ink", hex: "#8A5530", className: "bg-alert-ink" },
] as const;

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 py-6">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function EstiloPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-10">
      <PageHeader
        title="Guia de estilo"
        description="Tokens e componentes do MORANO."
        actions={
          <span className="bg-sand text-foreground rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
            DEMONSTRAÇÃO
          </span>
        }
      />

      <Section title="Paleta">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PALETTE.map((c) => (
            <li key={c.name} className="space-y-2">
              <div className={`${c.className} border-border h-14 rounded-lg border`} />
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-muted-foreground text-xs">{c.hex}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografia">
        <div className="space-y-3">
          <p className="font-heading text-4xl font-bold">Título 1 (Manrope)</p>
          <p className="font-heading text-2xl font-semibold">Título 2 (Manrope)</p>
          <p className="font-heading text-xl font-semibold">Título 3 (Manrope)</p>
          <p className="text-base">Texto de corpo em Inter, para leitura confortável.</p>
          <p className="text-muted-foreground text-sm">Texto pequeno em Inter, para apoio.</p>
        </div>
      </Section>

      <Section title="Marca">
        <div className="flex flex-wrap items-center gap-6">
          <Logo size="sm" />
          <Logo size="md" />
          <Logo size="lg" />
          <AppMark size={64} />
        </div>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap gap-3">
          {VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Campo">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="demo-input">Nome da casa</Label>
          <Input id="demo-input" placeholder="Ex.: Apartamento 82" />
        </div>
      </Section>

      <Section title="Carregamento">
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Section>

      <Section title="Estado vazio">
        <EmptyState
          icon={Inbox}
          title="Nada por aqui ainda"
          description="Quando houver itens, eles aparecem nesta área."
        />
      </Section>

      <Section title="Confirmação e avisos">
        <DemoActions />
      </Section>
    </main>
  );
}
