"use client";

import { useActionState, useEffect, useState } from "react";
import type { Event } from "@/features/events/queries";
import { formatTime } from "@/features/tasks/rotina-format";
import {
  type FormState,
  initialFormState,
} from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { toast } from "sonner";
import { EventItemsField } from "@/features/events/components/event-items-field";
import { pendingCountText, type LinkedEventItem } from "@/features/events/event-items";
import type { SuggestionSources } from "@/features/shopping/suggest";

// 4 visual tiles mapping to DB event_type values
const EVENT_TILES: Array<{
  value: Event["event_type"];
  label: string;
  iconBg: string;
  iconColor: string;
  activeBg: string;
  activeBorder: string;
  icon: React.ReactNode;
}> = [
  {
    value: "aniversario",
    label: "Aniversário",
    iconBg: "#FFFAF4",
    iconColor: "#C25B6E",
    activeBg: "#F3D2D8",
    activeBorder: "#C25B6E",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 20v-7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7M3 20h18M5 16c2 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3 1 4 0M12 12V9M12 7c-.8 0-1.2-.8-1.2-1.5S12 3.5 12 3.5s1.2 1.3 1.2 2S12.8 7 12 7z"/>
      </svg>
    ),
  },
  {
    value: "jantar",
    label: "Festa",
    iconBg: "#F6DDB9",
    iconColor: "#2A1B12",
    activeBg: "#FDF3E0",
    activeBorder: "#D98A2B",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3c-3 0-5 2.5-5 5.5S9 14 12 14s5-2.5 5-5.5S15 3 12 3zM12 14v2.5M10.5 17.5h3M12 17.5V21"/>
      </svg>
    ),
  },
  {
    value: "visita",
    label: "Compromisso",
    iconBg: "#D5DEEA",
    iconColor: "#2A1B12",
    activeBg: "#E8EFF6",
    activeBorder: "#4F6D93",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4M9.5 15l2 2 3.5-3.5"/>
      </svg>
    ),
  },
  {
    value: "outros",
    label: "Outros",
    iconBg: "#F5E4D2",
    iconColor: "#2A1B12",
    activeBg: "#F5E4D2",
    activeBorder: "#725E4F",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>
      </svg>
    ),
  },
];

// Map any existing event_type to the closest tile value
function normalizeType(t: Event["event_type"] | undefined): Event["event_type"] {
  if (!t) return "outros";
  if (t === "aniversario" || t === "jantar" || t === "visita" || t === "outros") return t;
  if (t === "consulta_medica") return "visita";
  if (t === "viagem" || t === "feriado") return "visita";
  if (t === "manutencao") return "outros";
  return "outros";
}

const inputClass =
  "w-full border border-border rounded-md px-3 py-2 text-sm bg-background";

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<Event>;
  createAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  updateAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  deleteAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  onSuccess?: () => void;
  /** Fontes do autocomplete dos itens de compras; sem elas a seção não aparece. */
  productSources?: SuggestionSources;
  /** Itens que o evento já pôs na lista de compras (edição). */
  linkedItems?: LinkedEventItem[];
  /** Remove um item vinculado (do evento e da lista de compras). */
  removeItemAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  /** false = sem permissão de Compras. */
  canRemoveItems?: boolean;
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
  productSources,
  linkedItems = [],
  removeItemAction,
  canRemoveItems = true,
}: Props) {
  const mainAction =
    mode === "create"
      ? (createAction ?? noopAction)
      : (updateAction ?? noopAction);

  // O formulário fecha no sucesso: avisos de itens que não entraram na lista vão por toast.
  const actionWithNotice = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await mainAction(prev, fd);
    if (result.status === "success" && result.message && !/^Evento (criado|atualizado)\.$/.test(result.message)) {
      toast(result.message, { duration: 8000 });
    }
    return result;
  };
  const [state, dispatch, pending] = useActionState(actionWithNotice, initialFormState);
  const [deleteState, deleteDispatch, deletePending] = useActionState(
    deleteAction ?? noopAction,
    initialFormState,
  );
  const [selectedType, setSelectedType] = useState<Event["event_type"]>(
    normalizeType(initialValues?.event_type)
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

        {/* Type tiles */}
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>
            Tipo
          </p>
          <input type="hidden" name="event_type" value={selectedType} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {EVENT_TILES.map((tile) => {
              const active = selectedType === tile.value;
              return (
                <button
                  key={tile.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedType(tile.value)}
                  style={{
                    height: 76,
                    borderRadius: 14,
                    background: active ? tile.activeBg : "var(--card)",
                    border: active ? `1.5px solid ${tile.activeBorder}` : "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 34, height: 34, borderRadius: 17,
                      background: tile.iconBg,
                      color: tile.iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {tile.icon}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: active ? 600 : 500 }}>
                    {tile.label}
                  </span>
                </button>
              );
            })}
          </div>
          {state.fieldErrors?.event_type ? (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.event_type}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="event-title" className="block text-sm font-medium mb-1">
            Nome
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
            defaultValue={formatTime(initialValues?.start_time) ?? ""}
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
            defaultValue={formatTime(initialValues?.end_time) ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.end_time ? (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.end_time}
            </p>
          ) : null}
        </div>

        {productSources ? <EventItemsField
            sources={productSources}
            linked={linkedItems}
            removeAction={removeItemAction}
            canRemove={canRemoveItems}
          /> : null}

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
            trigger={
              <Button type="button" variant="destructive" size="sm" disabled={pending || deletePending}>
                Excluir
              </Button>
            }
            title="Excluir evento"
            description={[
              `Excluir o evento "${initialValues.title ?? "este evento"}"?`,
              pendingCountText(linkedItems.filter((i) => !i.is_purchased).length),
            ].filter(Boolean).join(" ")}
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
          variant={mode === "create" ? "add" : "default"}
          className="ml-auto"
          disabled={pending || deletePending}
        >
          {pending ? "Salvando…" : mode === "create" ? "Criar evento" : "Salvar"}
        </Button>
      </div>
    </>
  );
}
