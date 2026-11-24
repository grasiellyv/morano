import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChartNoAxesColumn,
  ChevronRight,
  Package,
  PawPrint,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms, getRoutinesCount } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/dates";
import { getHomeMembers, type HomeMember } from "@/features/members/queries";
import { AVATAR_PALETTE, getInitial } from "@/features/members/avatar-palette";
import { PageHeader } from "@/components/feedback/page-header";
import { AccountButton } from "@/components/layout/account-button";

export const metadata: Metadata = { title: "Casa" };

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

const ROLE_LABELS: Record<HomeMember["role"], string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Morador",
};

const card: React.CSSProperties = {
  background: "var(--card)",
  boxShadow: "var(--shadow)",
};

const ORGANIZATION: Array<{ href: string; title: string; hint: string; Icon: LucideIcon }> = [
  { href: "/casa/membros", title: "Moradores", hint: "Contas e permissões", Icon: Users },
  { href: "/casa/animais", title: "Animais", hint: "Cuidados e necessidades", Icon: PawPrint },
  { href: "/casa/produtos", title: "Produtos", hint: "Itens recorrentes", Icon: Package },
  { href: "/casa/historico", title: "Histórico", hint: "Atividades da casa", Icon: ChartNoAxesColumn },
];

function isAbsentToday(m: HomeMember, today: string): boolean {
  return !!m.absence_start && !!m.absence_end && m.absence_start <= today && today <= m.absence_end;
}

export default async function Page() {
  const user = await requireUser();
  const home = await getHomeWithRooms(user.id);

  if (!home) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const today = getLocalDateString(home.timezone);
  const [routinesCount, members] = await Promise.all([
    getRoutinesCount(home.id),
    getHomeMembers(supabase),
  ]);
  const me = members.find((m) => m.user_id === user.id);
  const canInvite = me?.role === "owner" || me?.role === "admin";
  const propertyType = PROPERTY_TYPE_LABELS[home.property_type] ?? home.property_type;

  return (
    <>
      <PageHeader
        title="Casa"
        actions={
          <AccountButton name={me?.full_name ?? null} />
        }
      />

      {/* Identificação da casa */}
      <section aria-labelledby="casa-nome" className="-mt-2 mb-5">
        <h2 id="casa-nome" className="text-[20px] font-semibold tracking-[-0.3px]">{home.name}</h2>
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--muted-foreground)" }}>
          {members.length} {members.length === 1 ? "morador" : "moradores"} · {propertyType}
        </p>
      </section>

      {/* Quem faz parte */}
      <section aria-labelledby="quem-faz-parte" className="mb-6">
        <h2 id="quem-faz-parte" className="mb-2 text-[15px] font-semibold">Quem faz parte</h2>
        <div className="overflow-hidden rounded-[16px] border border-border" style={card}>
          <ul>
            {members.map((m, i) => {
              const palette = AVATAR_PALETTE[i % AVATAR_PALETTE.length]!;
              const absent = isAbsentToday(m, today);
              return (
                <li
                  key={m.user_id}
                  className="flex items-center gap-3 px-3.5 py-3"
                  style={{ borderBottom: i < members.length - 1 || canInvite ? "1px solid var(--border)" : undefined }}
                >
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
                    style={{ background: palette.bg, color: palette.color }}
                  >
                    {getInitial(m.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">
                      {m.full_name ?? "Morador"}
                      {m.user_id === user.id ? (
                        <span className="font-normal" style={{ color: "var(--muted-foreground)" }}> (você)</span>
                      ) : null}
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{ROLE_LABELS[m.role]}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-[8px] px-2 py-[3px] text-[11.5px] font-semibold"
                    style={
                      absent
                        ? { background: "var(--secondary)", color: "var(--foreground)" }
                        : { background: "var(--done-bg)", color: "var(--done-ink)" }
                    }
                  >
                    {absent ? "Ausente" : "Ativo"}
                  </span>
                </li>
              );
            })}
          </ul>
          {canInvite ? (
            <Link
              href="/casa/membros?secao=convites&novo=1"
              className="flex h-12 items-center gap-2 px-3.5 text-[13.5px] font-semibold no-underline"
              style={{ color: "var(--add-ink)" }}
            >
              <Plus size={16} aria-hidden />
              Convidar morador
            </Link>
          ) : null}
        </div>
      </section>

      {/* Organização da casa */}
      <section aria-labelledby="organizacao" className="mb-6">
        <h2 id="organizacao" className="mb-2 text-[15px] font-semibold">Organização da casa</h2>
        <div className="grid grid-cols-2 gap-3">
          {ORGANIZATION.map(({ href, title, hint, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[112px] flex-col rounded-[16px] border border-border p-3.5 no-underline"
              style={{ ...card, color: "var(--foreground)" }}
            >
              <Icon aria-hidden size={19} strokeWidth={1.75} />
              <span className="mt-auto pt-4 text-[16px] font-semibold leading-tight">{title}</span>
              <span className="mt-0.5 text-[12px] leading-snug" style={{ color: "var(--muted-foreground)" }}>
                {hint}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Sobre a casa */}
      <section aria-labelledby="sobre-casa">
        <div className="mb-2 flex items-center gap-2">
          <h2 id="sobre-casa" className="flex-1 text-[15px] font-semibold">Sobre a casa</h2>
          <Link
            href="/casa/editar"
            className="no-underline"
            style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", padding: "5px 10px" }}
          >
            Editar dados
          </Link>
        </div>

        <div className="rounded-[16px] border border-border p-4" style={card}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {[
              ["Tipo", propertyType],
              ["Posse", OWNERSHIP_TYPE_LABELS[home.ownership_type] ?? home.ownership_type],
              ["Composição", HOUSEHOLD_TYPE_LABELS[home.household_type] ?? home.household_type],
              ["Moradores", String(home.resident_count)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>{label}</dt>
                <dd style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href="/casa/comodos"
            className="flex flex-col rounded-[16px] border border-border p-3.5 no-underline"
            style={{ ...card, color: "var(--foreground)" }}
          >
            <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Cômodos</span>
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px", lineHeight: 1.15 }}>{home.rooms.length}</span>
            <span className="flex items-center gap-0.5" style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              Ver cômodos<ChevronRight size={13} aria-hidden />
            </span>
          </Link>
          <Link
            href="/rotina"
            className="flex flex-col rounded-[16px] border border-border p-3.5 no-underline"
            style={{ ...card, color: "var(--foreground)" }}
          >
            <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Tarefas da rotina</span>
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px", lineHeight: 1.15 }}>{routinesCount}</span>
            <span className="flex items-center gap-0.5" style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              Ver rotina<ChevronRight size={13} aria-hidden />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
