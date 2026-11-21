"use client";

import { useActionState, useEffect } from "react";
import type { Event } from "@/features/events/queries";
import {
  type FormState,
  initialFormState,
} from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

const EVENT_TYPES: Array<{ value: Event["event_type"]; label: string }> = [
  { value: "aniversario", label: "Aniversário" },
  { value: "viagem", label: "Viagem" },
  { value: "jantar", label: "Jantar" },
  { value: "consulta_medica", label: "Consulta" },
  { value: "visita", label: "Visita" },
  { value: "manutencao", label: "Manutenção" },
  { value: "feriado", label: "Feriado" },
  { value: "outros", label: "Outros" },
];

const inputClass =
  "w-full border border-border rounded-md px-3 py-2 text-sm bg-background";

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<Event>;
  createAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  updateAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  deleteAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  onSuccess?: () => void;
};

const noopAction = async (
  _prev: FormState,
  _fd: FormData,
): Promise<FormState> => ({ status: "idle" });

export function EventForm({
  mode,
  initialValues,
  createAction,
  updateAction,
  deleteAction,
  onSuccess,
}: Props) {
  const mainAction =
    mode === "create"
      ? (createAction ?? noopAction)
      : (updateAction ?? noopAction);

  const [state, dispatch] = useActionState(mainAction, initialFormState);
  const [deleteState, deleteDispatch] = useActionState(
    deleteAction ?? noopAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") onSuccess?.();
  }, [state.status, onSuccess]);

  useEffect(() => {
    if (deleteState.status === "success") onSuccess?.();
  }, [deleteState.status, onSuccess]);

  return (
    <>
      <form id="event-main-form" action={dispatch} className="space-y-4">
        {mode === "edit" && initialValues?.id ? (
          <input type="hidden" name="id" value={initialValues.id} />
        ) : null}

        <div>
          <label htmlFor="event-title" className="block text-sm font-medium mb-1">
            Título
          </label>
          <input
            id="event-title"
            name="title"
            type="text"
            required
            defaultValue={initialValues?.title ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.title ? (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="event-type" className="block text-sm font-medium mb-1">
            Tipo
          </label>
          <select
            id="event-type"
            name="event_type"
            defaultValue={initialValues?.event_type ?? "outros"}
            className={inputClass}
          >
            {EVENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.event_type ? (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.event_type}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="event-start-date"
            className="block text-sm font-medium mb-1"
          >
            Data de início
          </label>
          <input
            id="event-start-date"
            name="start_date"
            type="date"
            required
            defaultValue={initialValues?.start_date ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.start_date ? (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.start_date}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="event-end-date"
            className="block text-sm font-medium mb-1"
          >
            Data de fim{" "}
            <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="event-end-date"
            name="end_date"
            type="date"
            defaultValue={initialValues?.end_date ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.end_date ? (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.end_date}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="event-start-time"
            className="block text-sm font-medium mb-1"
          >
            Hora de início{" "}
            <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="event-start-time"
            name="start_time"
            type="time"
            defaultValue={initialValues?.start_time ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.start_time ? (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.start_time}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="event-end-time"
            className="block text-sm font-medium mb-1"
          >
            Hora de fim{" "}
            <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="event-end-time"
            name="end_time"
            type="time"
            defaultValue={initialValues?.end_time ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.end_time ? (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.end_time}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="event-description"
            className="block text-sm font-medium mb-1"
          >
            Descrição{" "}
            <span className="text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="event-description"
            name="description"
            rows={3}
            defaultValue={initialValues?.description ?? ""}
            className={`${inputClass} resize-none`}
          />
          {state.fieldErrors?.description ? (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.description}
            </p>
          ) : null}
        </div>

        {state.message ? (
          <p
            className={`text-sm ${
              state.status === "error"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>

      {deleteState.message && deleteState.status === "error" ? (
        <p className="mt-2 text-xs text-destructive">{deleteState.message}</p>
      ) : null}

      <div className="flex gap-2 justify-between mt-4">
        {mode === "edit" && initialValues?.id ? (
          <ConfirmDialog
            trigger={<Button type="button" variant="destructive" size="sm">Excluir</Button>}
            title="Excluir evento"
            description={`Excluir o evento "${initialValues.title ?? "este evento"}"?`}
            confirmLabel="Excluir"
            destructive
            onConfirm={() => {
              const fd = new FormData();
              fd.set("id", initialValues.id!);
              deleteDispatch(fd);
            }}
          />
        ) : null}
        <Button
          type="submit"
          form="event-main-form"
          size="sm"
          className="ml-auto"
        >
          {mode === "create" ? "Criar evento" : "Salvar"}
        </Button>
      </div>
    </>
  );
}
