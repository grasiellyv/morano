"use client";

import { useActionState, useTransition, useState, useEffect, useRef } from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/features/shopping/actions-categories";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import { initialFormState } from "@/features/auth/form-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

type Props = {
  categories: ShoppingCategory[];
  open: boolean;
  onClose: () => void;
};

// ---- Create Category Form ----
function CreateCategoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(createCategory, initialFormState);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={dispatch} className="flex flex-wrap items-center gap-2">
      <Input
        name="icon"
        placeholder="🛒"
        className="w-14 text-center"
        disabled={pending}
        maxLength={8}
        aria-label="Ícone da categoria"
      />
      <Input
        name="name"
        placeholder="Nome"
        required
        className="flex-1"
        disabled={pending}
        aria-label="Nome da nova categoria"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Adicionar"}
      </Button>
      {state.fieldErrors?.name ? (
        <p className="w-full text-xs text-destructive">{state.fieldErrors.name}</p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p className="w-full text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}

// ---- Single Category Row ----
function CategoryRow({
  cat,
  categories,
  index,
}: {
  cat: ShoppingCategory;
  categories: ShoppingCategory[];
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateDispatch, updatePending] = useActionState(
    updateCategory,
    initialFormState,
  );
  const [, delDispatch, delPending] = useActionState(deleteCategory, initialFormState);
  const [reorderPending, startReorder] = useTransition();

  useEffect(() => {
    if (updateState.status === "success") setEditing(false);
  }, [updateState]);

  const isFirst = index === 0;
  const isLast = index === categories.length - 1;
  const busy = updatePending || delPending || reorderPending;

  function moveUp() {
    if (isFirst) return;
    const prev = categories[index - 1]!;
    startReorder(async () => {
      const fdA = new FormData();
      fdA.set("id", cat.id);
      fdA.set("name", cat.name);
      fdA.set("icon", cat.icon);
      fdA.set("sort_order", String(prev.sort_order));
      await updateCategory(initialFormState, fdA);

      const fdB = new FormData();
      fdB.set("id", prev.id);
      fdB.set("name", prev.name);
      fdB.set("icon", prev.icon);
      fdB.set("sort_order", String(cat.sort_order));
      await updateCategory(initialFormState, fdB);
    });
  }

  function moveDown() {
    if (isLast) return;
    const next = categories[index + 1]!;
    startReorder(async () => {
      const fdA = new FormData();
      fdA.set("id", cat.id);
      fdA.set("name", cat.name);
      fdA.set("icon", cat.icon);
      fdA.set("sort_order", String(next.sort_order));
      await updateCategory(initialFormState, fdA);

      const fdB = new FormData();
      fdB.set("id", next.id);
      fdB.set("name", next.name);
      fdB.set("icon", next.icon);
      fdB.set("sort_order", String(cat.sort_order));
      await updateCategory(initialFormState, fdB);
    });
  }

  if (editing) {
    return (
      <form
        action={updateDispatch}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
      >
        <input type="hidden" name="id" value={cat.id} />
        <Input
          name="icon"
          defaultValue={cat.icon}
          className="w-14 text-center"
          disabled={updatePending}
          maxLength={8}
          aria-label="Ícone"
        />
        <Input
          name="name"
          defaultValue={cat.name}
          required
          className="flex-1"
          disabled={updatePending}
          aria-label="Nome"
          autoFocus
        />
        {updateState.status === "error" && updateState.message ? (
          <p className="w-full text-xs text-destructive">{updateState.message}</p>
        ) : null}
        <Button type="submit" size="sm" disabled={updatePending}>
          {updatePending ? "Salvando…" : "Salvar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={updatePending}
        >
          Cancelar
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2">
      <span className="flex-1 text-sm">
        {cat.icon} {cat.name}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={moveUp}
          disabled={isFirst || busy}
          className="rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          aria-label="Mover para cima"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={moveDown}
          disabled={isLast || busy}
          className="rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          aria-label="Mover para baixo"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={busy}
          className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label="Editar categoria"
        >
          Editar
        </button>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              disabled={delPending || reorderPending}
              className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              aria-label="Excluir categoria"
            >
              Excluir
            </button>
          }
          title="Excluir categoria"
          description={`Os itens da categoria '${cat.name}' ficarão sem categoria associada.`}
          confirmLabel="Excluir"
          destructive
          onConfirm={() => {
            const fd = new FormData();
            fd.set("id", cat.id);
            delDispatch(fd);
          }}
        />
      </div>
    </div>
  );
}

// ---- Main Dialog ----
export function ManageCategoriesDialog({ categories, open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Gerenciar categorias</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕ Fechar
          </button>
        </div>

        {/* Category list */}
        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria ainda.</p>
          ) : (
            categories.map((cat, index) => (
              <CategoryRow key={cat.id} cat={cat} categories={categories} index={index} />
            ))
          )}
        </div>

        {/* New category form */}
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">Nova categoria</p>
          <CreateCategoryForm />
        </div>
      </div>
    </div>
  );
}
