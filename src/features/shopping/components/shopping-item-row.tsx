"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import type { ShoppingItem } from "@/features/shopping/queries";
import { togglePurchased, editItem, deleteItem } from "@/features/shopping/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

type Category = ShoppingItem["category"];
type Unit = ShoppingItem["unit"];

const CATEGORY_LABELS: Record<Category, string> = {
  limpeza: "Limpeza",
  higiene: "Higiene",
  cozinha: "Cozinha",
  lavanderia: "Lavanderia",
  alimentacao: "Alimentação",
  outros: "Outros",
};

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
};

export function ShoppingItemRow({ item }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Controlled fields for edit mode
  const [editName, setEditName] = useState(item.name);
  const [editCategory, setEditCategory] = useState<Category>(item.category);
  const [editQuantity, setEditQuantity] = useState(String(item.quantity));
  const [editUnit, setEditUnit] = useState<Unit>(item.unit);

  // Finding 4: wrap toggle to surface errors via toast
  const wrappedToggle = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await togglePurchased(prev, fd);
    if (result.status === "error") toast.error(result.message ?? "Erro ao atualizar item");
    return result;
  };
  const [, toggleDispatch, togglePending] = useActionState(wrappedToggle, initialFormState);

  // Finding 3: wrap edit to close only on success
  const wrappedEdit = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await editItem(prev, fd);
    if (result.status === "success") setEditing(false);
    return result;
  };
  const [editState, editDispatch, editPending] = useActionState(wrappedEdit, initialFormState);

  // Finding 7 / Critical 1: delete handled via ConfirmDialog, not inline form
  async function handleDelete() {
    const fd = new FormData();
    fd.append("id", item.id);
    const result = await deleteItem(initialFormState, fd);
    // Finding 4: surface delete errors via toast
    if (result.status === "error") toast.error(result.message ?? "Erro ao excluir item");
    setMenuOpen(false);
  }

  const anyPending = togglePending || editPending;

  function startEdit() {
    setEditName(item.name);
    setEditCategory(item.category);
    setEditQuantity(String(item.quantity));
    setEditUnit(item.unit);
    setEditing(true);
    setMenuOpen(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        {/* Finding 3: removed onSubmit optimistic close; wrappedEdit closes on success */}
        <form
          action={editDispatch}
          className="space-y-2"
        >
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
              name="category"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as Category)}
              disabled={editPending}
              className={selectClass}
            >
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
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
      className={`flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 ${
        item.is_purchased ? "opacity-60" : ""
      }`}
    >
      {/* Checkbox — toggles purchased state */}
      <form action={toggleDispatch} className="mt-0.5 shrink-0">
        <input type="hidden" name="id" value={item.id} />
        <input
          type="hidden"
          name="is_purchased"
          value={String(!item.is_purchased)}
        />
        <button
          type="submit"
          disabled={anyPending}
          aria-label={item.is_purchased ? "Desmarcar como comprado" : "Marcar como comprado"}
          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors disabled:opacity-50 ${
            item.is_purchased
              ? "border-sage bg-sage text-white"
              : "border-stone hover:bg-muted"
          }`}
        >
          {item.is_purchased ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 12 12"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>
      </form>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-medium leading-snug ${
              item.is_purchased ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {item.name}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {CATEGORY_LABELS[item.category]}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.quantity} {UNIT_LABELS[item.unit]}
        </p>
      </div>

      {/* Menu "⋯" */}
      <div className="relative shrink-0">
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

            {/* Finding 7 / Critical 1: ConfirmDialog wraps delete — no form inside dropdown */}
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
