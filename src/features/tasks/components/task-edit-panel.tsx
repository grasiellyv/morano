"use client";

import { useActionState, useEffect } from "react";
import type { FormState } from "@/features/auth/form-state";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { OccurrenceWithTask } from "@/features/tasks/queries";

type Props = {
  task: OccurrenceWithTask["task"];
  rooms: Array<{ id: string; name: string }>;
  updateTaskAction: (_: FormState, fd: FormData) => Promise<FormState>;
  onSuccess: () => void;
  onCancel: () => void;
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
    if (state.status === "success") onSuccess();
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
        <Label htmlFor="edit-task-priority">Prioridade</Label>
        <select
          id="edit-task-priority"
          name="priority"
          defaultValue={task.priority}
          className={selectClass}
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </select>
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
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
