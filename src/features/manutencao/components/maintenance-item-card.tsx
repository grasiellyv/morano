"use client";

import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MaintenanceItem } from "@/features/manutencao/queries";
import {
  updateMaintenanceItem,
  updateMaintenanceStatus,
  reopenMaintenanceItem,
  deleteMaintenanceItem,
} from "@/features/manutencao/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const textareaClass =
  "min-h-[64px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none";

const STATUS_LABELS: Record<MaintenanceItem["status"], string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_BADGE_STYLE: Record<MaintenanceItem["status"], React.CSSProperties> = {
  pendente:    { borderRadius: 20, background: "var(--warn-bg)", color: "var(--warn-ink)", padding: "2px 10px", fontSize: 12, fontWeight: 500 },
  em_andamento:{ borderRadius: 20, background: "#D5DEEA",        color: "#2C4A6E",         padding: "2px 10px", fontSize: 12, fontWeight: 500 },
  concluido:   { borderRadius: 20, background: "#E0EADB",        color: "#2C5633",         padding: "2px 10px", fontSize: 12, fontWeight: 500 },
  cancelado:   { borderRadius: 20, background: "var(--secondary)", color: "var(--muted-foreground)", padding: "2px 10px", fontSize: 12, fontWeight: 500 },
};

type Props = {
  item: MaintenanceItem;
  onCompleted: (id: string) => void;
};

export function MaintenanceItemCard({ item, onCompleted }: Props) {
  const [showEdit, setShowEdit] = useState(false);

  // Track what status was submitted so we can trigger celebration on "concluido"
  const submittedStatusRef = useRef<string | null>(null);

  const wrappedUpdateStatus = async (prev: FormState, fd: FormData): Promise<FormState> => {
    submittedStatusRef.current = fd.get("status") as string;
    const result = await updateMaintenanceStatus(prev, fd);
    if (result.status === "success" && submittedStatusRef.current === "concluido") {
      onCompleted(item.id);
    }
    if (result.status === "error") {
      toast.error(result.message ?? "Erro ao atualizar status.");
    }
    return result;
  };

  const [, statusDispatch, statusPending] = useActionState(wrappedUpdateStatus, initialFormState);
  const [, reopenDispatch, reopenPending] = useActionState(reopenMaintenanceItem, initialFormState);

  // Edit form
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description ?? "");
  const [editNotes, setEditNotes] = useState(item.notes ?? "");

  const wrappedEdit = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await updateMaintenanceItem(prev, fd);
    if (result.status === "success") {
      setShowEdit(false);
    }
    return result;
  };

  const [editState, editDispatch, editPending] = useActionState(wrappedEdit, initialFormState);

  // Delete
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const fd = new FormData();
      fd.append("id", item.id);
      const result = await deleteMaintenanceItem(initialFormState, fd);
      if (result.status === "error") {
        toast.error(result.message ?? "Erro ao excluir item.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const canEdit = item.status === "pendente" || item.status === "em_andamento";

  if (showEdit) {
    return (
      <div style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow)", padding: "14px 16px" }}>
        <form action={editDispatch} className="space-y-3">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="room_id" value={item.room_id ?? ""} />

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Título</label>
            <Input
              name="title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              autoFocus
              disabled={editPending}
              aria-invalid={!!editState.fieldErrors?.title}
            />
            {editState.fieldErrors?.title ? (
              <p className="mt-1 text-xs text-destructive">{editState.fieldErrors.title}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Descrição</label>
            <textarea
              name="description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={editPending}
              className={textareaClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Notas</label>
            <textarea
              name="notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              disabled={editPending}
              className={textareaClass}
            />
          </div>

          {editState.status === "error" && editState.message ? (
            <p className="text-xs text-destructive">{editState.message}</p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={editPending}>
              {editPending ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowEdit(false)}
              disabled={editPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--card)",
        boxShadow: "var(--shadow)",
        padding: "14px 16px",
      }}
    >
        {/* Header: title + badge */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug text-foreground">{item.title}</p>
            {item.room ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.room.name}</p>
            ) : null}
          </div>
          <span style={STATUS_BADGE_STYLE[item.status]}>{STATUS_LABELS[item.status]}</span>
        </div>

        {/* Description */}
        {item.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        ) : null}

        {/* Notes */}
        {item.notes ? (
          <p className="mt-1 text-xs text-muted-foreground italic">{item.notes}</p>
        ) : null}

        {/* Date */}
        <p className="mt-1 text-xs text-muted-foreground">
          {canEdit
            ? `Aberto em ${format(parseISO(item.created_at), "d 'de' MMM", { locale: ptBR })}`
            : item.resolved_at
              ? `${item.status === "concluido" ? "Concluído" : "Cancelado"} em ${format(parseISO(item.resolved_at), "d 'de' MMM", { locale: ptBR })}`
              : `Aberto em ${format(parseISO(item.created_at), "d 'de' MMM", { locale: ptBR })}`}
        </p>

        {/* Actions */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Status transition buttons */}
          {item.status === "pendente" ? (
            <>
              <form action={statusDispatch}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value="em_andamento" />
                <Button type="submit" size="sm" variant="outline" disabled={statusPending || isDeleting}>
                  Iniciar
                </Button>
              </form>
              <form action={statusDispatch}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value="cancelado" />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={statusPending || isDeleting}
                  className="text-muted-foreground"
                >
                  Cancelar
                </Button>
              </form>
            </>
          ) : null}

          {item.status === "em_andamento" ? (
            <>
              <form action={statusDispatch}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value="concluido" />
                <Button type="submit" size="sm" variant="outline" disabled={statusPending || isDeleting}>
                  Concluir
                </Button>
              </form>
              <form action={statusDispatch}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value="cancelado" />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={statusPending || isDeleting}
                  className="text-muted-foreground"
                >
                  Cancelar
                </Button>
              </form>
            </>
          ) : null}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Reopen button — for concluido/cancelado */}
          {!canEdit && item.status !== "pendente" ? (
            <form action={reopenDispatch}>
              <input type="hidden" name="id" value={item.id} />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={reopenPending || isDeleting}
                className="text-muted-foreground"
              >
                {reopenPending ? "Reabrindo…" : "Reabrir"}
              </Button>
            </form>
          ) : null}

          {/* Edit button — hidden for concluido/cancelado */}
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditTitle(item.title);
                setEditDescription(item.description ?? "");
                setEditNotes(item.notes ?? "");
                setShowEdit(true);
              }}
              disabled={statusPending || isDeleting}
            >
              Editar
            </Button>
          ) : null}

          {/* Delete button — always visible */}
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={statusPending || isDeleting}
                className="text-destructive hover:text-destructive"
              >
                {isDeleting ? "Excluindo…" : "Excluir"}
              </Button>
            }
            title="Excluir item"
            description={`Tem certeza que deseja excluir "${item.title}"? Esta ação não pode ser desfeita.`}
            confirmLabel="Excluir"
            onConfirm={handleDelete}
            destructive
          />
        </div>
      </div>
  );
}
