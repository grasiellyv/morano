"use client";

import { ArrowRight } from "lucide-react";
import { useActionState, useEffect } from "react";
import Link from "next/link";
import type { FormState } from "@/features/auth/form-state";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PRIORITY_OPTIONS } from "@/features/tasks/labels";

type Props = {
  task: { id: string; title: string; priority: "baixa" | "media" | "alta"; is_essential: boolean; instructions: string | null; room_id: string | null; due_time?: string | null; description?: string | null };
  rooms: Array<{ id: string; name: string }>;
  updateTaskAction: (_: FormState, fd: FormData) => Promise<FormState>;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const selectClass =
  "border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

export function TaskEditPanel({
  task,
  rooms,
  updateTaskAction,
  onSuccess,
  onCancel,
}: Props) {
  const [state, dispatch, pending] = useActionState(updateTaskAction, initialFormState);

  useEffect(() => {
    if (state.status === "success") onSuccess?.();
  }, [state.status]);

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="id" value={task.id} />

      <div className="space-y-1.5">
        <Label htmlFor="edit-task-title">Título</Label>
        <Input
          id="edit-task-title"
          name="title"
          defaultValue={task.title}
          required
          autoFocus
        />
        {state.fieldErrors?.title ? (
          <p className="text-xs text-destructive">{state.fieldErrors.title}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-task-description">Descrição (opcional)</Label>
        <Input
          id="edit-task-description"
          name="description"
          maxLength={500}
          defaultValue={task.description ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-task-priority">Prioridade</Label>
        <select
          id="edit-task-priority"
          name="priority"
          defaultValue={task.priority}
          className={selectClass}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-task-due-time">Horário (opcional)</Label>
        <Input
          id="edit-task-due-time"
          name="due_time"
          type="time"
          defaultValue={task.due_time?.slice(0, 5) ?? ""}
        />
        {state.fieldErrors?.due_time ? (
          <p className="text-xs text-destructive">{state.fieldErrors.due_time}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="edit-task-essential"
          name="is_essential"
          value="true"
          defaultChecked={task.is_essential}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        <Label htmlFor="edit-task-essential">Tarefa essencial</Label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-task-instructions">Como fazer (opcional)</Label>
        <textarea
          id="edit-task-instructions"
          name="instructions"
          rows={3}
          defaultValue={task.instructions ?? ""}
          className={`${selectClass} h-auto resize-y`}
        />
      </div>

      {rooms.length > 0 ? (
        <div className="space-y-1.5">
          <Label htmlFor="edit-task-room">Cômodo (opcional)</Label>
          <select
            id="edit-task-room"
            name="room_id"
            defaultValue={task.room_id ?? ""}
            className={selectClass}
          >
            <option value="">Nenhum</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
      {state.status === "success" && !onSuccess ? (
        <p className="text-sm text-green-600">{state.message}</p>
      ) : null}
      {onCancel ? (
        <div className="mt-3 border-t border-border pt-3">
          <Link
            href={`/rotina/tarefas/${task.id}/editar`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Editar agendamento
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      ) : null}
    </form>
  );
}
