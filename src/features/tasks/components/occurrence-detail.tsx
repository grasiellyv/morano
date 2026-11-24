"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  completeOccurrence,
  undoComplete,
  claimOccurrence,
  unclaimOccurrence,
} from "@/features/tasks/actions";
import { ShoppingShortcut } from "@/features/tasks/components/shopping-shortcut";
import { EditOccurrenceButton } from "@/features/tasks/components/edit-occurrence-sheet";
import { initialFormState } from "@/features/auth/form-state";
import type { OccurrenceDetail } from "@/features/tasks/queries";
import { ChecklistList, checklistProgress } from "@/features/tasks/components/checklist-list";
import { describeRecurrence, firstName, formatLongDate, formatTime } from "@/features/tasks/rotina-format";

type Member = { id: string; name: string | null };

const icon = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/**
 * Tela da tarefa (uma ocorrência): quem, quando, recorrência, checklist do dia,
 * atalho para a lista de compras e "Concluir tarefa".
 */
export function OccurrenceDetailView({
  occurrence,
  today,
  userId,
  members,
}: {
  occurrence: OccurrenceDetail;
  today: string;
  userId: string;
  members: Member[];
}) {
  const task = occurrence.task;
  const isCompleted = occurrence.status === "completed";
  const isPending = occurrence.status === "pending";
  const backHref = occurrence.scheduled_for === today ? "/rotina" : `/rotina?date=${occurrence.scheduled_for}`;

  const assigned = occurrence.assigned_to ? members.find((m) => m.id === occurrence.assigned_to) : null;
  const who = occurrence.assigned_to === userId ? "Você" : assigned ? firstName(assigned.name) : "Compartilhada";
  const time = formatTime(task.due_time);
  const progress = checklistProgress(task.checklist, occurrence.checklist_states);

  const [, completeDispatch, completePending] = useActionState(completeOccurrence, initialFormState);
  const [undoState, undoDispatch, undoPending] = useActionState(undoComplete, initialFormState);
  const [, claimDispatch, claimPending] = useActionState(claimOccurrence, initialFormState);
  const [, unclaimDispatch, unclaimPending] = useActionState(unclaimOccurrence, initialFormState);

  return (
    <div className="pb-4">
      {/* Barra superior */}
      <div className="-mx-2 mb-4 flex items-center justify-between">
        <Link
          href={backHref}
          aria-label="Voltar para a rotina"
          className="flex items-center justify-center rounded-full focus-visible:outline-2"
          style={{ width: 44, height: 44 }}
        >
          <svg {...icon} width={20} height={20} strokeWidth={1.75}>
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </Link>
        <EditOccurrenceButton
          occurrenceId={occurrence.id}
          taskId={task.id}
          scheduledFor={occurrence.scheduled_for}
          today={today}
          status={occurrence.status}
          assignedTo={occurrence.assigned_to}
          notes={occurrence.notes}
          userId={userId}
          members={members}
        />
      </div>

      {/* Categoria e prioridade */}
      {task.room || task.priority === "alta" || task.is_essential ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {task.room ? <Tag dark>{task.room.name}</Tag> : null}
          {task.priority === "alta" ? <Tag warn>Prioridade alta</Tag> : null}
          {task.is_essential ? <Tag>Essencial</Tag> : null}
        </div>
      ) : null}

      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.5px", lineHeight: 1.15 }}>{task.title}</h1>
      {task.description ? (
        <p style={{ fontSize: 14.5, color: "var(--muted-foreground)", marginTop: 8, lineHeight: 1.5 }}>{task.description}</p>
      ) : null}

      {occurrence.notes ? (
        <p
          className="mt-3 rounded-xl"
          style={{ fontSize: 13.5, background: "var(--secondary)", padding: "8px 12px", lineHeight: 1.45 }}
        >
          <span style={{ fontWeight: 600 }}>Observação desta vez: </span>
          {occurrence.notes}
        </p>
      ) : null}

      {/* Quem, quando, recorrência */}
      <dl
        className="mt-5 rounded-2xl border border-border"
        style={{ background: "var(--card)", padding: "4px 16px" }}
      >
        <InfoRow
          label="Responsável"
          value={who}
          icon={<svg {...icon}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>}
          action={
            isPending && occurrence.assigned_to === null ? (
              <form action={claimDispatch}>
                <input type="hidden" name="occurrence_id" value={occurrence.id} />
                <SmallButton disabled={claimPending}>{claimPending ? "…" : "Eu pego"}</SmallButton>
              </form>
            ) : isPending && occurrence.assigned_to === userId ? (
              <form action={unclaimDispatch}>
                <input type="hidden" name="occurrence_id" value={occurrence.id} />
                <SmallButton disabled={unclaimPending} quiet>Liberar</SmallButton>
              </form>
            ) : null
          }
        />
        <InfoRow
          label="Data"
          value={formatLongDate(occurrence.scheduled_for)}
          icon={<svg {...icon}><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>}
        />
        <InfoRow
          label="Horário"
          value={time ?? "A qualquer hora"}
          icon={<svg {...icon}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
        />
        <InfoRow
          label="Recorrência"
          value={describeRecurrence(task.routine)}
          last
          icon={
            <svg {...icon}>
              <path d="M17 2l3 3-3 3" /><path d="M4 11v-1a5 5 0 0 1 5-5h11" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v1a5 5 0 0 1-5 5H4" />
            </svg>
          }
        />
      </dl>

      {task.instructions ? (
        <details className="group mt-4 rounded-2xl border border-border" style={{ background: "var(--card)" }}>
          <summary
            className="flex cursor-pointer list-none items-center justify-between rounded-2xl px-4 [&::-webkit-details-marker]:hidden"
            style={{ minHeight: 48, fontSize: 14, fontWeight: 600 }}
          >
            Como fazer
            <svg {...icon} width={16} height={16} strokeWidth={1.75} className="transition-transform group-open:rotate-180" style={{ color: "var(--muted-foreground)" }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <p className="px-4 pb-4" style={{ fontSize: 13.5, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
            {task.instructions}
          </p>
        </details>
      ) : null}

      {/* Checklist */}
      <section className="mt-6" aria-labelledby="checklist-title">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 id="checklist-title" style={{ fontSize: 17, fontWeight: 600 }}>Checklist</h2>
          {progress.total > 0 ? (
            <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>
              {progress.done} de {progress.total} feitos
              {progress.skipped > 0 ? ` · ${progress.skipped} ${progress.skipped === 1 ? "pulado" : "pulados"}` : ""}
            </span>
          ) : null}
        </div>
        <div className="-ml-2">
          <ChecklistList
            occurrenceId={occurrence.id}
            taskId={task.id}
            items={task.checklist}
            states={occurrence.checklist_states}
            editable
            disabled={isCompleted}
          />
        </div>
      </section>

      {/* Lista de compras */}
      <ShoppingShortcut taskTitle={task.title} roomId={task.room_id} />

      {/* Concluir */}
      {/* Fixo acima da barra de navegação; o fundo em degradê evita que o texto rolando passe por baixo do aviso. */}
      <div
        className="sticky z-10 -mx-5 mt-4 px-5"
        style={{
          bottom: 82,
          paddingTop: 20,
          paddingBottom: 14,
          background: "linear-gradient(to bottom, transparent, var(--background) 22px)",
        }}
      >
        {isCompleted ? (
          <form action={undoDispatch}>
            <input type="hidden" name="occurrence_id" value={occurrence.id} />
            <button
              type="submit"
              disabled={undoPending}
              className="w-full rounded-xl border border-border font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              style={{ height: 50, fontSize: 15, background: "var(--card)", boxShadow: "var(--shadow)" }}
            >
              {undoPending ? "Desfazendo…" : "Concluída · Desfazer"}
            </button>
            {undoState.status === "error" && undoState.message ? (
              <p className="mt-2 text-center text-destructive" style={{ fontSize: 12.5 }}>{undoState.message}</p>
            ) : null}
          </form>
        ) : isPending ? (
          <form action={completeDispatch}>
            <input type="hidden" name="occurrence_id" value={occurrence.id} />
            {progress.open > 0 ? (
              <p className="mb-2 text-center" style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>
                {progress.open} {progress.open === 1 ? "item ficou" : "itens ficaram"} em aberto. Na próxima vez a checklist recomeça.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={completePending}
              className="w-full rounded-xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70"
              style={{ height: 50, fontSize: 15, background: "var(--nav-active)", color: "var(--nav-active-ink)", boxShadow: "0 8px 24px rgba(40,20,10,0.18)" }}
            >
              {completePending ? "Concluindo…" : "Concluir tarefa"}
            </button>
          </form>
        ) : (
          <p className="text-center" style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            {occurrence.status === "skipped" ? "Esta vez foi pulada." : "Esta vez não foi feita."}
          </p>
        )}
      </div>
    </div>
  );
}

function Tag({ children, dark, warn }: { children: React.ReactNode; dark?: boolean; warn?: boolean }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 8,
        padding: "3px 9px",
        background: dark ? "var(--nav-active)" : warn ? "var(--warn-bg)" : "var(--secondary)",
        color: dark ? "var(--nav-active-ink)" : warn ? "var(--warn-ink)" : "var(--foreground)",
      }}
    >
      {children}
    </span>
  );
}

function InfoRow({
  label,
  value,
  icon: ic,
  action,
  last,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{ minHeight: 64, borderBottom: last ? "none" : "1px solid var(--border)" }}
    >
      <span style={{ color: "var(--muted-foreground)", display: "flex" }}>{ic}</span>
      <div className="min-w-0 flex-1">
        <dt style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</dt>
        <dd style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 1 }}>{value}</dd>
      </div>
      {action}
    </div>
  );
}

function SmallButton({ children, disabled, quiet }: { children: React.ReactNode; disabled?: boolean; quiet?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-lg px-3 font-medium focus-visible:outline-2 disabled:opacity-60"
      style={{
        height: 32,
        fontSize: 12.5,
        background: quiet ? "transparent" : "var(--secondary)",
        color: quiet ? "var(--muted-foreground)" : "var(--foreground)",
      }}
    >
      {children}
    </button>
  );
}
