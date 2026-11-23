"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ShoppingItem } from "@/features/shopping/queries";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import { togglePurchased, editItem, deleteItem } from "@/features/shopping/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

type Unit = ShoppingItem["unit"];

const UNIT_LABELS: Record<Unit, string> = {
  un: "un",
  kg: "kg",
  g: "g",
  l: "l",
  ml: "ml",
  pacote: "pacote",
  caixa: "caixa",
};

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

type Props = {
  item: ShoppingItem;
  categories: ShoppingCategory[];
};

export function ShoppingItemRow({ item, categories }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointer(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  // Controlled fields for edit mode
  const [editName, setEditName] = useState(item.name);
  const [editCategoryId, setEditCategoryId] = useState<string>(item.category?.id ?? "");
  const [editQuantity, setEditQuantity] = useState(String(item.quantity));
  const [editUnit, setEditUnit] = useState<Unit>(item.unit);
  const [editNotes, setEditNotes] = useState<string>(item.notes ?? "");

  // wrap toggle to surface errors via toast
  const wrappedToggle = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await togglePurchased(prev, fd);
    if (result.status === "error") toast.error(result.message ?? "Erro ao atualizar item");
    return result;
  };
  const [, toggleDispatch, togglePending] = useActionState(wrappedToggle, initialFormState);

  // wrap edit to close only on success
  const wrappedEdit = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await editItem(prev, fd);
    if (result.status === "success") setEditing(false);
    return result;
  };
  const [editState, editDispatch, editPending] = useActionState(wrappedEdit, initialFormState);

  const [isDeleting, setIsDeleting] = useState(false);

  // delete handled via ConfirmDialog
  async function handleDelete() {
    setIsDeleting(true);
    try {
      const fd = new FormData();
      fd.append("id", item.id);
      const result = await deleteItem(initialFormState, fd);
      if (result.status === "error") toast.error(result.message ?? "Erro ao excluir item");
      setMenuOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const anyPending = togglePending || editPending || isDeleting;

  function startEdit() {
    setEditName(item.name);
    setEditCategoryId(item.category?.id ?? "");
    setEditQuantity(String(item.quantity));
    setEditUnit(item.unit);
    setEditNotes(item.notes ?? "");
    setEditing(true);
    setMenuOpen(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        {/* wrappedEdit closes on success */}
        <form action={editDispatch} className="space-y-2">
          <input type="hidden" name="id" value={item.id} />

          <Input
            name="name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nome do item"
            required
            autoFocus
            disabled={editPending}
          />

          <div className="flex flex-wrap gap-2">
            <select
              name="category_id"
              value={editCategoryId}
              onChange={(e) => setEditCategoryId(e.target.value)}
              disabled={editPending}
              className={selectClass}
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            <Input
              name="quantity"
              type="number"
              min="0.01"
              step="any"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              className="w-20"
              disabled={editPending}
            />

            <select
              name="unit"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value as Unit)}
              disabled={editPending}
              className={selectClass}
            >
              {(Object.keys(UNIT_LABELS) as Unit[]).map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>

          <Input
            name="notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Detalhes (ex: sem lactose, marca preferida)"
            maxLength={200}
            disabled={editPending}
          />

          {editState.status === "error" ? (
            <p className="text-xs text-destructive">
              {editState.fieldErrors?.name ?? editState.message}
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={editPending}>
              {editPending ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
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
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--card)",
        boxShadow: "var(--shadow)",
        padding: "10px 14px",
        minHeight: 52,
        opacity: item.is_purchased ? 0.6 : 1,
      }}
    >
      {/* Checkbox */}
      <form action={toggleDispatch} className="shrink-0">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="is_purchased" value={String(!item.is_purchased)} />
        <button
          type="submit"
          disabled={anyPending}
          aria-label={item.is_purchased ? "Desmarcar como comprado" : "Marcar como comprado"}
          style={{
            width: 22, height: 22, borderRadius: 11,
            border: item.is_purchased ? "none" : "1.5px solid var(--muted-foreground)",
            background: item.is_purchased ? "var(--nav-active)" : "transparent",
            color: item.is_purchased ? "var(--nav-active-ink)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {item.is_purchased ? (
            <svg viewBox="0 0 12 12" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
              <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>
      </form>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            style={{
              fontSize: 14, fontWeight: 500,
              color: item.is_purchased ? "var(--muted-foreground)" : "var(--foreground)",
              textDecoration: item.is_purchased ? "line-through" : "none",
            }}
          >
            {item.name}
          </span>
          {item.category ? (
            <span style={{ borderRadius: 8, background: "var(--secondary)", color: "var(--muted-foreground)", padding: "1px 7px", fontSize: 11.5 }}>
              {item.category.icon} {item.category.name}
            </span>
          ) : null}
        </div>
        <p style={{ marginTop: 1, fontSize: 12, color: "var(--muted-foreground)" }}>
          {item.quantity} {UNIT_LABELS[item.unit]}
          {item.notes ? ` · ${item.notes}` : ""}
          {item.room ? ` · ${item.room.name}` : ""}
        </p>
      </div>

      {/* Menu "⋯" */}
      <div ref={menuRef} className="relative shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Mais opções"
          aria-expanded={menuOpen}
          disabled={anyPending}
        >
          ⋯
        </Button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-10 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          >
            <button
              role="menuitem"
              type="button"
              onClick={startEdit}
              className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
            >
              Editar
            </button>

            {/* ConfirmDialog wraps delete — no form inside dropdown */}
            <ConfirmDialog
              trigger={
                <button
                  role="menuitem"
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted"
                >
                  Excluir
                </button>
              }
              title="Excluir item"
              description={`Tem certeza que deseja excluir "${item.name}"? Esta ação não pode ser desfeita.`}
              confirmLabel="Excluir"
              onConfirm={handleDelete}
              destructive
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
