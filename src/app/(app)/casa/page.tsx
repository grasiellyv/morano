import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms, getRoutinesCount } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getHomeMembers } from "@/features/members/queries";
import { PageHeader } from "@/components/feedback/page-header";

export const metadata: Metadata = { title: "Minha casa" };

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  sobrado: "Sobrado",
  studio_kitnet: "Studio/Kitnet",
  outro: "Outro",
};

const OWNERSHIP_TYPE_LABELS: Record<string, string> = {
  proprio: "Próprio",
  alugado: "Alugado",
  outro: "Outro",
};

const HOUSEHOLD_TYPE_LABELS: Record<string, string> = {
  sozinho: "Sozinho",
  casal: "Casal",
  familia: "Família",
  compartilhada: "Compartilhada",
  outro: "Outro",
};

export default async function Page() {
  const user = await requireUser();
  const home = await getHomeWithRooms(user.id);

  if (!home) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const [routinesCount, members] = await Promise.all([
    getRoutinesCount(home.id),
    getHomeMembers(supabase),
  ]);

  return (
    <>
      <PageHeader
        title={home.name}
        actions={
          <Link
            href="/casa/editar"
            className="flex items-center gap-1 no-underline"
            style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", padding: "5px 10px" }}
          >
            Editar dados
          </Link>
        }
      />

      {/* Resumo da residência */}
      <section
        className="mb-4"
        style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow)", padding: "14px 16px" }}
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
          <div>
            <dt style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Tipo</dt>
            <dd style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{PROPERTY_TYPE_LABELS[home.property_type] ?? home.property_type}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Posse</dt>
            <dd style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{OWNERSHIP_TYPE_LABELS[home.ownership_type] ?? home.ownership_type}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Composição</dt>
            <dd style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{HOUSEHOLD_TYPE_LABELS[home.household_type] ?? home.household_type}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Moradores</dt>
            <dd style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{home.resident_count}</dd>
          </div>
        </dl>
      </section>

      {/* Cards de stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        {/* Cômodos */}
        <Link
          href="/casa/comodos"
          className="no-underline"
          style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2, color: "var(--foreground)" }}
        >
          <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Cômodos</p>
          <p style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px", lineHeight: 1.1 }}>{home.rooms.length}</p>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Ver cômodos →</p>
        </Link>

        {/* Tarefas */}
        <Link
          href="/rotina"
          className="no-underline"
          style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2, color: "var(--foreground)" }}
        >
          <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Tarefas da rotina</p>
          <p style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px", lineHeight: 1.1 }}>{routinesCount}</p>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Ver rotina →</p>
        </Link>

        {/* Membros */}
        <Link
          href="/casa/membros"
          className="no-underline"
          style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2, color: "var(--foreground)" }}
        >
          <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Membros</p>
          <p style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px", lineHeight: 1.1 }}>{members.length}</p>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Ver membros →</p>
        </Link>
      </section>

      {/* Links de gestão */}
      <section className="mt-4">
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 rounded-xl border border-border p-3.5 no-underline"
          style={{ background: "var(--card)", color: "var(--foreground)" }}
        >
          <div
            className="flex items-center justify-center rounded-[9px]"
            style={{ width: 32, height: 32, background: "var(--secondary)" }}
          >
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
              <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="10" cy="18" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <span className="flex-1 text-sm font-medium">Configurações</span>
          <ChevronRight size={16} strokeWidth={1.8} style={{ color: "var(--muted-foreground)" }} />
        </Link>
      </section>
    </>
  );
}
