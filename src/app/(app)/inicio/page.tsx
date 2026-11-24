import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  ChevronRight,
  Sun,
  SunMedium,
  Moon,
  CalendarClock,
  ShoppingBag,
  Wrench,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { AccountButton } from "@/components/layout/account-button";
import { ExpandableList } from "@/components/ui/expandable-list";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/dates";
import { formatHourShort, getHeroPeriod, greetingFor, GREETING_LABEL, type HeroPeriod } from "@/lib/day-period";
import { extendWindowForHome } from "@/features/tasks/actions";
import { CompleteCircleButton } from "@/features/tasks/components/complete-circle-button";
import {
  markMissedOccurrences,
  getTodayOccurrences,
  getOverdueOccurrences,
  type OccurrenceWithTask,
} from "@/features/tasks/queries";
import { formatShortDate } from "@/features/tasks/rotina-format";
import { getShoppingItems } from "@/features/shopping/queries";
import { getReorderSuggestions } from "@/features/shopping/queries-lists";
import { MISSION_LABELS } from "@/features/shopping/schemas";
import { getMaintenanceItems } from "@/features/manutencao/queries";
import { getHomeMembers } from "@/features/members/queries";
import { AVATAR_PALETTE, getInitial } from "@/features/members/avatar-palette";

export const metadata: Metadata = { title: "Início" };

function AvatarCircle({
  name,
  index,
  size = 44,
  fontSize = 16,
  overlap = false,
}: {
  name: string | null;
  index: number;
  size?: number;
  fontSize?: number;
  overlap?: boolean;
}) {
  const palette = AVATAR_PALETTE[index % AVATAR_PALETTE.length]!;
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: palette.bg,
        color: palette.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize,
        flexShrink: 0,
        ...(overlap ? { boxShadow: "0 0 0 2px var(--card)", marginLeft: -12 } : {}),
      }}
    >
      {getInitial(name)}
    </div>
  );
}

/** Tom do card "Olá" por período do dia (fuso da casa). Tokens em globals.css. */
const HERO_THEME: Record<HeroPeriod, { a: string; b: string; glow: string; Icon: LucideIcon; label: string }> = {
  morning: { a: "var(--hero-morning-a)", b: "var(--hero-morning-b)", glow: "var(--hero-morning-glow)", Icon: Sun, label: GREETING_LABEL.morning },
  afternoon: { a: "var(--hero-afternoon-a)", b: "var(--hero-afternoon-b)", glow: "var(--hero-afternoon-glow)", Icon: SunMedium, label: GREETING_LABEL.afternoon },
  night: { a: "var(--hero-night-a)", b: "var(--hero-night-b)", glow: "var(--hero-night-glow)", Icon: Moon, label: GREETING_LABEL.night },
};

const CREAM = "#FBEFE3";
/** Creme a 85%: ≥ 5.8:1 sobre o tom mais claro (manhã). */
const CREAM_SOFT = "rgba(251,239,227,0.85)";

type Tone = "warn" | "amber" | "neutral";
const TONE_STYLE: Record<Tone, React.CSSProperties> = {
  warn: { background: "var(--warn-bg)", color: "var(--warn-ink)" },
  amber: { background: "#F6DDB9", color: "#6E420F" },
  neutral: { background: "var(--secondary)", color: "var(--foreground)" },
};

type AttentionItem = {
  key: string;
  href: string;
  Icon: LucideIcon;
  title: string;
  meta: string;
  badge: string;
  tone: Tone;
};

function AttentionRow({ item, last }: { item: AttentionItem; last: boolean }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-3.5 no-underline"
      style={{ minHeight: 60, borderBottom: last ? undefined : "1px solid var(--border)", color: "var(--foreground)" }}
    >
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-[10px]"
        style={{ width: 34, height: 34, ...TONE_STYLE[item.tone] }}
      >
        <item.Icon size={17} />
      </span>
      <span className="min-w-0 flex-1 py-2.5">
        <span className="block truncate text-[14px] font-medium">{item.title}</span>
        <span className="block truncate text-[12px]" style={{ color: "var(--muted-foreground)" }}>
          {item.meta}
        </span>
      </span>
      <span className="shrink-0 rounded-[8px] px-2 py-[3px] text-[11.5px] font-semibold" style={TONE_STYLE[item.tone]}>
        {item.badge}
      </span>
    </Link>
  );
}

function checklistCount(o: OccurrenceWithTask): { done: number; total: number } | null {
  const items = o.task.checklist ?? [];
  if (items.length === 0) return null;
  const ids = new Set(items.map((i) => i.id));
  const done = (o.checklist_states ?? []).filter((s) => ids.has(s.item_id) && s.status === "done").length;
  return { done, total: items.length };
}

const CheckMark = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export default async function Page() {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);
  if (!home) redirect("/onboarding");

  const supabase = await createClient();
  const today = getLocalDateString(home.timezone);
  const period = getHeroPeriod(home.timezone);
  const theme = HERO_THEME[period];

  // Operações de manutenção independentes rodam em paralelo (não uma após a outra)
  // para cortar round-trips sequenciais ao Supabase remoto. Ambas ainda são
  // aguardadas antes das leituras, garantindo consistência.
  await Promise.all([
    extendWindowForHome(home.id, home.timezone).catch(() => {}),
    markMissedOccurrences(supabase, home.id, today).catch(() => {}),
  ]);

  const [todayOcc, overdueOcc, shopping, maintenance, reorderSuggestions, homeMembers, profileResult] =
    await Promise.all([
      getTodayOccurrences(supabase, home.id, today),
      getOverdueOccurrences(supabase, home.id, today),
      getShoppingItems(supabase, home.id),
      getMaintenanceItems(supabase, home.id),
      getReorderSuggestions(supabase, home.id, today),
      getHomeMembers(supabase),
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);

  const fullName = profileResult.data?.full_name ?? null;

  // Progresso do dia
  const completedToday = todayOcc.filter((o) => o.status === "completed").length;
  const totalToday = todayOcc.length;
  const pendingToday = totalToday - completedToday;
  const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  // Resumos de manutenção e compras
  const maintenanceOverdue = maintenance.filter((m) => m.status === "pendente" || m.status === "em_andamento");
  const overdueCount = overdueOcc.length;
  const shoppingPending = shopping.pending.length;
  const reorderCount = reorderSuggestions.length;

  const roomMap = new Map(home.rooms.map((r) => [r.id, r.name]));
  const memberMap = new Map(homeMembers.map((m, i) => [m.user_id, { name: m.full_name, index: i }]));
  const assigneeName = (id: string | null) => {
    const name = id ? memberMap.get(id)?.name : null;
    return name ? name.trim().split(/\s+/)[0] ?? name : null;
  };

  // Contagem de tarefas pendentes por morador (sub-texto do card Moradores)
  const memberTaskCounts = new Map<string, number>();
  for (const occ of todayOcc) {
    if (occ.assigned_to && occ.status === "pending") {
      memberTaskCounts.set(occ.assigned_to, (memberTaskCounts.get(occ.assigned_to) ?? 0) + 1);
    }
  }
  const memberSummary = homeMembers
    .filter((m) => memberTaskCounts.has(m.user_id))
    .map((m) => {
      const n = memberTaskCounts.get(m.user_id)!;
      const first = m.full_name ? m.full_name.trim().split(/\s+/)[0] : "?";
      return `${first}: ${n} tarefa${n !== 1 ? "s" : ""}`;
    })
    .join(" · ");

  // Rotina de hoje — pendentes por horário, com o resumo da tarefa
  const pendingTasks = todayOcc
    .filter((o) => o.status === "pending")
    .sort((a, b) => (a.task.due_time ?? "99").localeCompare(b.task.due_time ?? "99"));
  const ROUTINE_LIMIT = 6;
  const topTasks = pendingTasks.slice(0, ROUTINE_LIMIT);

  // Precisa de atenção — atrasadas, compras urgentes, reposições vencendo, manutenção pendente
  const attention: AttentionItem[] = [
    ...overdueOcc.map((o): AttentionItem => {
      const who = assigneeName(o.assigned_to);
      return {
        key: `t-${o.id}`,
        href: `/rotina/ocorrencia/${o.id}`,
        Icon: CalendarClock,
        title: o.task.title,
        meta: [who ? `Responsável: ${who}` : null, `Era para ${formatShortDate(o.scheduled_for)}`].filter(Boolean).join(" · "),
        badge: "Atrasada",
        tone: "warn",
      };
    }),
    ...shopping.pending
      .filter((i) => i.priority === "urgente")
      .map((i): AttentionItem => ({
        key: `s-${i.id}`,
        href: "/compras",
        Icon: ShoppingBag,
        title: i.name,
        meta: [i.mission ? MISSION_LABELS[i.mission] : null, "Compras"].filter(Boolean).join(" · "),
        badge: "Urgente",
        tone: "warn",
      })),
    ...reorderSuggestions
      .filter((r) => r.overdue || r.due_date <= today)
      .map((r): AttentionItem => ({
        key: `r-${r.id}`,
        href: "/compras",
        Icon: ShoppingBag,
        title: r.name,
        meta: `Reposição · ${r.list_name}`,
        badge: r.overdue ? "Atrasada" : "Hoje",
        tone: r.overdue ? "warn" : "amber",
      })),
    ...maintenance
      .filter((m) => m.status === "pendente")
      .map((m): AttentionItem => ({
        key: `m-${m.id}`,
        href: "/manutencao",
        Icon: Wrench,
        title: m.title,
        meta: ["Manutenção", m.room?.name].filter(Boolean).join(" · "),
        badge: "Pendente",
        tone: "neutral",
      })),
  ];
  const ATTENTION_LIMIT = 3;
  const attentionVisible = attention.slice(0, ATTENTION_LIMIT);
  const attentionMore = attention.slice(ATTENTION_LIMIT);
  const hasUrgent = attention.some((a) => a.tone === "warn");

  const homeStatus = hasUrgent
    ? { label: "Pede atenção", style: TONE_STYLE.warn }
    : { label: "Organizada", style: { background: "var(--done-bg)", color: "var(--done-ink)" } };

  const stats = [
    { label: "Tarefas", value: pendingToday, href: "/rotina", sr: "tarefas para hoje" },
    { label: "Compras", value: shoppingPending, href: "/compras", sr: "itens na lista de compras" },
    { label: "Cuidados", value: maintenanceOverdue.length, href: "/manutencao", sr: "cuidados de manutenção em aberto" },
  ];

  return (
    <>
      {/* ── CABEÇALHO ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 h-11 mb-3">
        <span className="flex-1 text-[22px] font-semibold tracking-[-0.6px]">Morano</span>
        <NotificationBell
          homeId={home.id}
          items={attention.map(({ key, href, title, meta, badge, tone }) => ({ key, href, title, meta, badge, tone }))}
        />
        <AccountButton name={fullName} />
      </div>

      {/* ── HERO: OLÁ + RESUMO DA CASA (tom muda com a hora) ───── */}
      <section
        aria-labelledby="resumo-casa"
        data-period={period}
        className="relative overflow-hidden rounded-[20px] p-4"
        style={{ background: `linear-gradient(160deg, ${theme.a}, ${theme.b})`, color: CREAM }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            right: -50, top: -60, width: 220, height: 220, borderRadius: 110,
            background: `radial-gradient(circle, ${theme.glow}, transparent 68%)`,
          }}
        />

        <div className="relative flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-[5px] text-[12.5px] font-medium"
            style={{ background: "rgba(251,239,227,0.12)" }}
            title={theme.label}
          >
            <theme.Icon aria-hidden size={14} />
            <span>{greetingFor(period, fullName)}</span>
          </div>
          <span className="rounded-[8px] px-2 py-[3px] text-[11.5px] font-semibold" style={homeStatus.style}>
            {homeStatus.label}
          </span>
        </div>

        <h2 id="resumo-casa" className="relative mt-3.5 text-[15px] font-semibold">
          Resumo da casa
        </h2>

        <div className="relative -mx-2 mt-1.5 grid grid-cols-3 gap-1">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-[12px] px-2 py-2 no-underline transition-colors hover:bg-[rgba(251,239,227,0.08)]"
              style={{ color: CREAM }}
            >
              <span className="block text-[26px] font-semibold leading-none tracking-[-0.5px]" aria-hidden>
                {s.value}
              </span>
              <span className="mt-1.5 block text-[12.5px]" style={{ color: CREAM_SOFT }} aria-hidden>
                {s.label}
              </span>
              <span className="sr-only">
                {s.value} {s.sr}
              </span>
            </Link>
          ))}
        </div>

        {totalToday > 0 ? (
          <div className="relative mt-2.5">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalToday}
              aria-valuenow={completedToday}
              aria-label="Tarefas de hoje concluídas"
              className="h-[5px] overflow-hidden rounded-full"
              style={{ background: "rgba(251,239,227,0.16)" }}
            >
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: "#F2C48D" }} />
            </div>
            <p className="mt-1.5 text-[12px]" style={{ color: CREAM_SOFT }}>
              {completedToday} de {totalToday} {totalToday !== 1 ? "tarefas feitas" : "tarefa feita"} hoje
            </p>
          </div>
        ) : null}
      </section>

      {/* ── PRECISA DE ATENÇÃO ────────────────────────────────── */}
      {attention.length > 0 ? (
        <section aria-labelledby="atencao" className="mt-4">
          <div className="flex h-7 items-center gap-2">
            <h2 id="atencao" className="flex-1 text-[15px] font-semibold">Precisa de atenção</h2>
            <span className="text-[12.5px] font-medium" style={{ color: "var(--muted-foreground)" }}>
              {attention.length} {attention.length === 1 ? "item" : "itens"}
            </span>
          </div>
          <div
            className="mt-1.5 overflow-hidden rounded-[16px] border border-border"
            style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
          >
            <ExpandableList
              moreCount={attentionMore.length}
              more={attentionMore.map((item, i) => (
                <AttentionRow key={item.key} item={item} last={i === attentionMore.length - 1} />
              ))}
            >
              {attentionVisible.map((item, i) => (
                <AttentionRow
                  key={item.key}
                  item={item}
                  last={i === attentionVisible.length - 1 && attentionMore.length === 0}
                />
              ))}
            </ExpandableList>
          </div>
        </section>
      ) : null}

      {/* ── ROTINA DE HOJE ────────────────────────────────────── */}
      <section aria-labelledby="rotina-hoje">
        <div className="mt-4 flex items-center gap-2 h-7">
          <h2 id="rotina-hoje" className="flex-1 text-[15px] font-semibold">Rotina de hoje</h2>
          <Link href="/rotina" className="text-[12.5px] font-medium" style={{ color: "var(--muted-foreground)" }}>
            {pendingToday > 0 ? `${pendingToday} ${pendingToday !== 1 ? "tarefas" : "tarefa"}` : "Ver rotina"}
          </Link>
          <Link
            href="/rotina"
            aria-label="Adicionar tarefa"
            className="flex size-7 items-center justify-center rounded-full"
            style={{ background: "var(--add)", color: "var(--add-foreground)" }}
          >
            <Plus aria-hidden size={14} strokeWidth={1.75} />
          </Link>
        </div>

        {topTasks.length > 0 ? (
          <div
            className="mt-1.5 overflow-hidden rounded-[16px] border border-border"
            style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
          >
            {topTasks.map((o, idx) => {
              const who = assigneeName(o.assigned_to);
              const time = formatHourShort(o.task.due_time);
              const roomName = o.task.room_id ? roomMap.get(o.task.room_id) ?? null : null;
              const check = checklistCount(o);
              const meta = [who, time, roomName].filter(Boolean).join(" · ");
              return (
                <div
                  key={o.id}
                  className="flex items-center gap-1 pl-2"
                  style={{ minHeight: 60, borderBottom: idx < topTasks.length - 1 ? "1px solid var(--border)" : undefined }}
                >
                  <CompleteCircleButton occurrenceId={o.id} title={o.task.title} />
                  <Link
                    href={`/rotina/ocorrencia/${o.id}`}
                    className="flex min-w-0 flex-1 items-center gap-2 self-stretch py-2.5 pr-3 no-underline"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-medium">{o.task.title}</span>
                        {o.task.priority === "alta" ? (
                          <span className="shrink-0 rounded-[6px] px-1.5 py-[1px] text-[10.5px] font-semibold" style={TONE_STYLE.warn}>
                            Alta
                          </span>
                        ) : null}
                      </span>
                      {meta || check ? (
                        <span className="mt-[1px] flex items-center gap-2 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                          {meta ? <span className="truncate">{meta}</span> : null}
                          {check ? (
                            <span className="inline-flex shrink-0 items-center gap-1">
                              <ListChecks aria-hidden size={13} />
                              <span className="sr-only">Checklist:</span>
                              {check.done}/{check.total}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight aria-hidden size={16} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />
                  </Link>
                </div>
              );
            })}
            {pendingTasks.length > ROUTINE_LIMIT ? (
              <Link
                href="/rotina"
                className="flex w-full items-center gap-2 border-t border-border px-3.5"
                style={{ height: 40, color: "var(--foreground)", fontSize: 12.5, fontWeight: 500 }}
              >
                <span className="flex-1">Ver mais {pendingTasks.length - ROUTINE_LIMIT} na rotina</span>
                <ChevronRight aria-hidden size={15} strokeWidth={1.75} />
              </Link>
            ) : null}
            {/* "N concluídas hoje" footer */}
            {completedToday > 0 && (
              <Link
                href="/rotina"
                className="flex w-full items-center gap-2 px-3.5"
                style={{ height: 40, background: "var(--secondary)", color: "var(--muted-foreground)", fontSize: 12.5, fontWeight: 500 }}
              >
                <CheckMark />
                <span className="flex-1">
                  {completedToday} concluída{completedToday !== 1 ? "s" : ""} hoje
                </span>
                <ChevronRight aria-hidden size={15} strokeWidth={1.75} />
              </Link>
            )}
          </div>
        ) : completedToday > 0 ? (
          <Link
            href="/rotina"
            className="mt-1.5 flex items-center gap-2 rounded-[16px] border border-border px-3.5"
            style={{ height: 54, background: "var(--card)", boxShadow: "var(--shadow)", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500 }}
          >
            <CheckMark />
            <span className="flex-1">{completedToday} concluída{completedToday !== 1 ? "s" : ""} hoje</span>
            <ChevronRight aria-hidden size={15} strokeWidth={1.75} />
          </Link>
        ) : (
          <div
            className="mt-1.5 rounded-[16px] border border-border px-4 py-4 text-center text-[13px]"
            style={{ background: "var(--card)", color: "var(--muted-foreground)" }}
          >
            Sem tarefas para hoje
          </div>
        )}
      </section>

      {/* ── 2-COL GRID: MANUTENÇÃO + COMPRAS ─────────────────── */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {/* Manutenção */}
        <Link
          href="/manutencao"
          className="flex flex-col rounded-[16px] p-3 pb-[11px] no-underline"
          style={{
            background: overdueCount > 0 ? "var(--warn-bg)" : "var(--card)",
            color: overdueCount > 0 ? "var(--warn-ink)" : "var(--foreground)",
            border: overdueCount > 0 ? "none" : "1px solid var(--border)",
            boxShadow: overdueCount > 0 ? "none" : "var(--shadow)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-[9px]"
              style={{
                width: 28, height: 28,
                background: overdueCount > 0 ? "var(--warn-icon)" : "#F6DDB9",
                color: overdueCount > 0 ? "var(--warn-ink)" : "#6E420F",
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 5a4 4 0 0 0-4.5 5.4L4 17l3 3 6.6-6.5A4 4 0 0 0 19 9l-2.5 2.5-2.5-.5-.5-2.5z" />
              </svg>
            </div>
            <span className="flex-1 text-[13px] font-medium">Manutenção</span>
            <ChevronRight aria-hidden size={15} strokeWidth={1.75} style={{ opacity: 0.6 }} />
          </div>
          <p className="mt-[9px] text-[15px] font-semibold">
            {overdueCount > 0 ? `${overdueCount} vencida${overdueCount !== 1 ? "s" : ""}` : maintenanceOverdue.length > 0 ? `${maintenanceOverdue.length} ativa${maintenanceOverdue.length !== 1 ? "s" : ""}` : "Tudo ok"}
          </p>
          <p className="mt-[1px] text-[12px] leading-[1.35]" style={{ opacity: 0.8 }}>
            {overdueCount > 0
              ? overdueOcc[0] ? overdueOcc[0].task.title : "Tarefa atrasada"
              : maintenanceOverdue.length > 0
                ? (maintenanceOverdue[0]?.title ?? "")
                : "Nenhum item pendente"}
          </p>
        </Link>

        {/* Compras */}
        <Link
          href="/compras"
          className="flex flex-col rounded-[16px] border border-border p-3 pb-[10px] no-underline"
          style={{ background: "var(--card)", color: "var(--foreground)", boxShadow: "var(--shadow)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-[9px]"
              style={{ width: 28, height: 28, background: "#F6DDB9", color: "#6E420F" }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 8h12l1 12H5z" />
                <path d="M9 8V7a3 3 0 0 1 6 0v1" />
              </svg>
            </div>
            <span className="flex-1 text-[13px] font-medium">Compras</span>
            <ChevronRight aria-hidden size={15} strokeWidth={1.75} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <p className="mt-[9px] text-[15px] font-semibold">
            {shoppingPending === 0 && reorderCount === 0 ? "Lista vazia" : shoppingPending > 0 ? `${shoppingPending} item${shoppingPending !== 1 ? "ns" : ""}` : `${reorderCount} para repor`}
          </p>
          <p className="mt-[1px] text-[12px] leading-[1.35]" style={{ color: "var(--muted-foreground)" }}>
            {reorderCount > 0
              ? `${reorderCount} item${reorderCount !== 1 ? "ns" : ""} para repor`
              : shoppingPending > 0
                ? "na lista de compras"
                : "Tudo em ordem"}
          </p>
          {reorderCount > 0 && (
            <div
              className="mt-2 flex items-center gap-1.5 border-t pt-[7px] text-[11.5px] font-medium"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="rounded-full"
                style={{ width: 7, height: 7, background: "#D98A2B", flexShrink: 0 }}
              />
              <span>{reorderCount} para repor</span>
            </div>
          )}
        </Link>
      </div>

      {/* ── MORADORES ─────────────────────────────────────────── */}
      {homeMembers.length > 0 && (
        <div
          className="mt-3 flex flex-col gap-3 rounded-[16px] border border-border p-3.5"
          style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[15px] font-semibold">Moradores</p>
              <p className="mt-[1px] text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                {memberSummary || `${homeMembers.length} na casa`}
              </p>
            </div>
            <div
              className="rounded-[8px] px-2.5 py-1 text-[11.5px] font-medium"
              style={{ background: "var(--secondary)" }}
            >
              {homeMembers.length} na casa
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center" role="img" aria-label={homeMembers.map((m) => m.full_name ?? "Membro").join(", ")}>
              {homeMembers.slice(0, 4).map((m, i) => (
                <AvatarCircle key={m.user_id} name={m.full_name} index={i} overlap={i > 0} />
              ))}
            </div>
            <Link
              href="/casa"
              aria-label="Adicionar morador"
              className="flex items-center justify-center rounded-full"
              style={{
                width: 44, height: 44, flexShrink: 0,
                border: "1.5px dashed var(--add)",
                background: "transparent", color: "var(--add-ink)",
              }}
            >
              <Plus aria-hidden size={18} strokeWidth={1.75} />
            </Link>
            <div className="flex-1" />
            <Link
              href="/casa"
              className="flex items-center gap-1.5 rounded-[10px] px-3.5 no-underline text-[13px] font-medium"
              style={{ height: 38, background: "var(--foreground)", color: "var(--card)" }}
            >
              Ver casa
              <ChevronRight aria-hidden size={14} strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
