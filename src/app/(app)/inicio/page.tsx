import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, SlidersHorizontal, Plus, ChevronRight, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/dates";
import { extendWindowForHome, completeOccurrence } from "@/features/tasks/actions";
import {
  markMissedOccurrences,
  getTodayOccurrences,
  getOverdueOccurrences,
  getOccurrencesForWeek,
} from "@/features/tasks/queries";
import { getShoppingItems } from "@/features/shopping/queries";
import { getReorderSuggestions } from "@/features/shopping/queries-lists";
import { getMaintenanceItems } from "@/features/manutencao/queries";
import { getHomeMembers } from "@/features/members/queries";

export const metadata: Metadata = { title: "Início" };

/** Paleta de avatares: cores para os primeiros moradores */
const AVATAR_PALETTE = [
  { bg: "#EBD5BE", color: "#6B3A17" },
  { bg: "#F3CFCF", color: "#8A2F3A" },
  { bg: "#D5DEEA", color: "#2C4A6E" },
  { bg: "#D8E8D6", color: "#2D5428" },
  { bg: "#E8D5EA", color: "#5A2D6B" },
];

function getInitial(name: string | null, fallback = "?"): string {
  return (name ?? fallback).charAt(0).toUpperCase();
}

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

export default async function Page() {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);
  if (!home) redirect("/onboarding");

  const supabase = await createClient();
  const today = getLocalDateString(home.timezone);
  const todayDate = parseISO(today);

  await extendWindowForHome(home.id, home.timezone).catch(() => {});
  await markMissedOccurrences(supabase, home.id, today).catch(() => {});

  // Semana atual (Seg–Dom)
  const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const DAY_ABBRS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weekDays = Array.from({ length: 7 }, (_, i) => ({
    dateStr: format(addDays(weekStart, i), "yyyy-MM-dd"),
    label: DAY_ABBRS[i],
  }));

  const [todayOcc, overdueOcc, shopping, maintenance, reorderSuggestions, weekOccs, homeMembers, profileResult] =
    await Promise.all([
      getTodayOccurrences(supabase, home.id, today),
      getOverdueOccurrences(supabase, home.id, today),
      getShoppingItems(supabase, home.id),
      getMaintenanceItems(supabase, home.id),
      getReorderSuggestions(supabase, home.id, today),
      getOccurrencesForWeek(supabase, home.id, weekStartStr),
      getHomeMembers(supabase),
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);

  const fullName = profileResult.data?.full_name ?? null;
  const firstName = fullName ? fullName.split(" ")[0] : "você";

  // Progresso do dia
  const completedToday = todayOcc.filter((o) => o.status === "completed").length;
  const totalToday = todayOcc.length;
  const pendingToday = totalToday - completedToday;

  // Mapa de conclusão por dia da semana
  const weekMap = new Map<string, { total: number; completed: number }>();
  for (const occ of weekOccs) {
    const d = occ.scheduled_for;
    const entry = weekMap.get(d) ?? { total: 0, completed: 0 };
    entry.total++;
    if (occ.status === "completed") entry.completed++;
    weekMap.set(d, entry);
  }

  // Resumos de manutenção e compras
  const maintenanceOverdue = maintenance.filter((m) => m.status === "pendente" || m.status === "em_andamento");
  const overdueCount = overdueOcc.length;
  const shoppingPending = shopping.pending.length;
  const reorderCount = reorderSuggestions.length;

  // Tarefas pendentes para exibir (até 4)
  const topTasks = todayOcc.filter((o) => o.status === "pending").slice(0, 4);
  const roomMap = new Map(home.rooms.map((r) => [r.id, r.name]));
  const memberMap = new Map(homeMembers.map((m, i) => [m.user_id, { name: m.full_name, index: i }]));

  async function completeTaskAction(fd: FormData) {
    "use server";
    await completeOccurrence({ status: "idle" }, fd);
  }

  // Contagem de tarefas pendentes por morador (para sub-texto do card Moradores)
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

  // Progress ring
  const RING_R = 32;
  const circumference = 2 * Math.PI * RING_R;
  const arc = totalToday > 0 ? (circumference * completedToday) / totalToday : 0;

  // Headline de tarefas
  const heroHeadline =
    pendingToday === 0 && totalToday > 0
      ? "Tudo feito por hoje 🎉"
      : pendingToday === 1
        ? "Falta 1 coisa leve para hoje"
        : pendingToday > 1
          ? `Faltam ${pendingToday} coisas leves para hoje`
          : "Nada programado para hoje";

  const heroSubtitle =
    totalToday === 0
      ? "Aproveite o dia livre"
      : `${completedToday} já feita${completedToday !== 1 ? "s" : ""} · ${totalToday} no total`;

  return (
    <>
      {/* ── CABEÇALHO ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 h-11 mb-3">
        <span className="flex-1 text-[22px] font-semibold tracking-[-0.6px]">Morano</span>
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex size-10 items-center justify-center rounded-full border border-border"
          style={{ background: "var(--card)" }}
        >
          <Bell aria-hidden size={19} strokeWidth={1.6} />
          {overdueCount > 0 ? (
            <span
              aria-hidden
              className="absolute rounded-full border-2"
              style={{ top: 9, right: 10, width: 8, height: 8, background: "#C8643C", borderColor: "var(--card)" }}
            />
          ) : null}
        </button>
        <Link
          href="/configuracoes"
          aria-label="Ajustes da casa"
          className="flex size-10 items-center justify-center rounded-full border border-border"
          style={{ background: "var(--card)" }}
        >
          <SlidersHorizontal aria-hidden size={19} strokeWidth={1.6} />
        </Link>
        <div
          className="flex size-10 items-center justify-center rounded-full text-[15px] font-semibold"
          style={{ background: "#EBD5BE", color: "#6B3A17" }}
          aria-label={`Perfil de ${firstName}`}
        >
          {getInitial(fullName)}
        </div>
      </div>

      {/* ── HERO CARD ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-[20px] p-4 pb-3.5"
        style={{
          background: "linear-gradient(160deg, var(--hero-a), var(--hero-b))",
          color: "#FBEFE3",
        }}
      >
        {/* Glow decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            right: -50,
            top: -60,
            width: 220,
            height: 220,
            borderRadius: 110,
            background: "radial-gradient(circle, rgba(242,183,122,0.42), rgba(242,183,122,0) 68%)",
          }}
        />

        {/* Saudação + link Rotina */}
        <div className="relative flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 text-[12.5px] font-medium rounded-[10px] px-2.5 py-[5px]"
            style={{ background: "rgba(251,239,227,0.12)" }}
          >
            <span>Olá, {firstName}</span>
          </div>
          <Link
            href="/rotina"
            aria-label="Abrir rotina"
            className="flex size-7 items-center justify-center rounded-[14px]"
            style={{ background: "rgba(251,239,227,0.14)", color: "#FBEFE3" }}
          >
            <ArrowUpRight aria-hidden size={15} strokeWidth={1.8} />
          </Link>
        </div>

        {/* Headline + Progress ring */}
        <div className="relative mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[22px] font-light leading-[1.2] tracking-[-0.3px] max-w-[200px]">
              {heroHeadline}
            </p>
            <p className="text-[12.5px]" style={{ color: "rgba(251,239,227,0.78)" }}>
              {heroSubtitle}
            </p>
          </div>
          <div className="relative shrink-0" style={{ width: 68, height: 68 }}>
            <svg width={68} height={68} viewBox="0 0 80 80" aria-hidden>
              <circle
                cx={40} cy={40} r={RING_R}
                fill="none"
                stroke="rgba(251,239,227,0.16)"
                strokeWidth={7}
              />
              <circle
                cx={40} cy={40} r={RING_R}
                fill="none"
                stroke="#F2C48D"
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${arc.toFixed(1)} ${circumference.toFixed(2)}`}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center text-[15px] font-medium"
            >
              {completedToday}/{totalToday}
            </div>
          </div>
        </div>

        {/* Tira semanal */}
        <div className="relative mt-3 flex gap-1.5">
          {weekDays.map(({ dateStr, label }) => {
            const stats = weekMap.get(dateStr);
            const isToday = dateStr === today;
            const isPast = dateStr < today;
            const hasAny = stats && stats.total > 0;
            const allDone = hasAny && stats!.completed === stats!.total;
            const someDone = hasAny && stats!.completed > 0;

            if (isToday) {
              return (
                <div
                  key={dateStr}
                  className="flex flex-1 flex-col items-center justify-center gap-[3px] rounded-[12px]"
                  style={{ height: 44, background: "#FBEFE3", color: "#2B1E16" }}
                >
                  <span className="text-[10.5px] font-semibold">{label}</span>
                  {allDone ? (
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{ width: 15, height: 15, background: "#F2C48D", color: "#2B1E16" }}
                    >
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </div>
                  ) : (
                    <div
                      className="rounded-full box-border"
                      style={{ width: 15, height: 15, border: "2px solid #C8803F" }}
                    />
                  )}
                </div>
              );
            }

            if (isPast) {
              return (
                <div
                  key={dateStr}
                  className="flex flex-1 flex-col items-center justify-center gap-[3px] rounded-[12px]"
                  style={{ height: 44, background: "rgba(242,196,141,0.16)" }}
                >
                  <span className="text-[10.5px] font-medium" style={{ color: "rgba(251,239,227,0.8)" }}>
                    {label}
                  </span>
                  {allDone || someDone ? (
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{ width: 15, height: 15, background: "#F2C48D", color: "#2B1E16" }}
                    >
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </div>
                  ) : (
                    <div
                      className="rounded-full box-border"
                      style={{ width: 15, height: 15, border: "1.5px solid rgba(251,239,227,0.3)" }}
                    />
                  )}
                </div>
              );
            }

            // Future
            return (
              <div
                key={dateStr}
                className="flex flex-1 flex-col items-center justify-center gap-[3px] rounded-[12px]"
                style={{ height: 44, background: "rgba(251,239,227,0.07)" }}
              >
                <span className="text-[10.5px] font-medium" style={{ color: "rgba(251,239,227,0.62)" }}>
                  {label}
                </span>
                <div
                  className="rounded-full box-border"
                  style={{ width: 15, height: 15, border: "1.5px solid rgba(251,239,227,0.3)" }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TAREFAS DE HOJE ───────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-2 h-7">
        <h2 className="flex-1 text-[15px] font-semibold">Para fazer hoje</h2>
        <Link
          href="/rotina"
          className="text-[12.5px] font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Ver rotina
        </Link>
        <Link
          href="/rotina"
          aria-label="Adicionar tarefa"
          className="flex size-7 items-center justify-center rounded-full"
          style={{ background: "var(--foreground)", color: "var(--card)" }}
        >
          <Plus aria-hidden size={14} strokeWidth={2.2} />
        </Link>
      </div>

      {topTasks.length > 0 ? (
        <div
          className="mt-1.5 overflow-hidden rounded-[16px] border border-border"
          style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
        >
          {topTasks.map((o, idx) => {
            const memberInfo = o.assigned_to ? memberMap.get(o.assigned_to) : null;
            const palette = memberInfo ? AVATAR_PALETTE[memberInfo.index % AVATAR_PALETTE.length] : null;
            const roomName = o.task.room_id ? roomMap.get(o.task.room_id) ?? null : null;
            return (
              <div
                key={o.id}
                className="flex items-center gap-3 px-3"
                style={{
                  height: 54,
                  boxSizing: "border-box",
                  borderBottom: idx < topTasks.length - 1 ? "1px solid var(--border)" : undefined,
                }}
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-[10px]"
                  style={{ width: 36, height: 36, background: "var(--secondary)", color: "var(--foreground)" }}
                >
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{o.task.title}</p>
                  {roomName && (
                    <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                      {roomName}
                    </p>
                  )}
                </div>
                {memberInfo && palette && (
                  <div
                    aria-hidden
                    className="shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ width: 24, height: 24, background: palette.bg, color: palette.color }}
                  >
                    {getInitial(memberInfo.name)}
                  </div>
                )}
                <form action={completeTaskAction}>
                  <input type="hidden" name="occurrence_id" value={o.id} />
                  <button
                    type="submit"
                    aria-label={`Concluir: ${o.task.title}`}
                    className="shrink-0 rounded-full"
                    style={{ width: 26, height: 26, border: "1.5px solid var(--muted-foreground)", background: "transparent" }}
                  />
                </form>
              </div>
            );
          })}
          {/* "N concluídas hoje" footer */}
          {completedToday > 0 && (
            <Link
              href="/rotina"
              className="flex w-full items-center gap-2 px-3.5"
              style={{ height: 40, background: "var(--secondary)", color: "var(--muted-foreground)", fontSize: 12.5, fontWeight: 500 }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <span className="flex-1">
                {completedToday} concluída{completedToday !== 1 ? "s" : ""} hoje
              </span>
              <ChevronRight aria-hidden size={15} strokeWidth={2} />
            </Link>
          )}
          {topTasks.length === 0 && totalToday === 0 && (
            <div className="px-4 py-4 text-center text-[13px]" style={{ color: "var(--muted-foreground)" }}>
              Sem tarefas para hoje
            </div>
          )}
        </div>
      ) : completedToday > 0 ? (
        <Link
          href="/rotina"
          className="mt-1.5 flex items-center gap-2 rounded-[16px] border border-border px-3.5"
          style={{ height: 54, background: "var(--card)", boxShadow: "var(--shadow)", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500 }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <span className="flex-1">{completedToday} concluída{completedToday !== 1 ? "s" : ""} hoje</span>
          <ChevronRight aria-hidden size={15} strokeWidth={2} />
        </Link>
      ) : (
        <div
          className="mt-1.5 rounded-[16px] border border-border px-4 py-4 text-center text-[13px]"
          style={{ background: "var(--card)", color: "var(--muted-foreground)" }}
        >
          Sem tarefas para hoje
        </div>
      )}

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
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 5a4 4 0 0 0-4.5 5.4L4 17l3 3 6.6-6.5A4 4 0 0 0 19 9l-2.5 2.5-2.5-.5-.5-2.5z" />
              </svg>
            </div>
            <span className="flex-1 text-[13px] font-medium">Manutenção</span>
            <ChevronRight aria-hidden size={15} strokeWidth={1.8} style={{ opacity: 0.6 }} />
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
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 8h12l1 12H5z" />
                <path d="M9 8V7a3 3 0 0 1 6 0v1" />
              </svg>
            </div>
            <span className="flex-1 text-[13px] font-medium">Compras</span>
            <ChevronRight aria-hidden size={15} strokeWidth={1.8} style={{ color: "var(--muted-foreground)" }} />
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
                border: "1.5px dashed var(--muted-foreground)",
                background: "transparent", color: "var(--foreground)",
              }}
            >
              <Plus aria-hidden size={18} strokeWidth={1.8} />
            </Link>
            <div className="flex-1" />
            <Link
              href="/casa"
              className="flex items-center gap-1.5 rounded-[10px] px-3.5 no-underline text-[13px] font-medium"
              style={{ height: 38, background: "var(--foreground)", color: "var(--card)" }}
            >
              Ver casa
              <ChevronRight aria-hidden size={14} strokeWidth={2} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
