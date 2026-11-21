"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createList,
  updateList,
  deleteList,
  addListItem,
  updateListItem,
  deleteListItem,
  applyList,
} from "@/features/shopping/actions-lists";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShoppingList, ShoppingListItem } from "@/features/shopping/queries-lists";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import { SHOPPING_CATALOG } from "@/features/shopping/catalog";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

type Props = {
  lists: ShoppingList[];
  categories: ShoppingCategory[];
};

// ---- Create List Form ----
function CreateListForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, dispatch, pending] = useActionState(createList, initialFormState);

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={dispatch} className="flex flex-wrap items-center gap-2 py-2">
      <Input
        name="name"
        placeholder="Nome da lista"
        required
        disabled={pending}
        autoFocus
        className="flex-1"
        aria-label="Nome da nova lista"
      />
      {state.fieldErrors?.name ? (
        <p className="w-full text-xs text-destructive">{state.fieldErrors.name}</p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p className="w-full text-xs text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}

// ---- Add Item Form (per list) ----
function AddListItemForm({
  listId,
  categories,
}: {
  listId: string;
  categories: ShoppingCategory[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [nameValue, setNameValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [suggestions, setSuggestions] = useState<typeof SHOPPING_CATALOG>([]);
  const [showExtras, setShowExtras] = useState(false);

  const wrappedAdd = async (
    prev: typeof initialFormState,
    fd: FormData,
  ): Promise<typeof initialFormState> => {
    const result = await addListItem(prev, fd);
    if (result.status === "success") {
      setNameValue("");
      setCategoryId("");
      setSuggestions([]);
      setShowExtras(false);
      formRef.current?.reset();
      nameRef.current?.focus();
    }
    return result;
  };

  const [state, dispatch, pending] = useActionState(wrappedAdd, initialFormState);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setNameValue(val);
    if (val.length >= 2) {
      const lower = val.toLowerCase();
      setSuggestions(
        SHOPPING_CATALOG.filter((item) => item.name.toLowerCase().includes(lower)).slice(0, 8),
      );
    } else {
      setSuggestions([]);
    }
  }

  function selectSuggestion(item: (typeof SHOPPING_CATALOG)[number]) {
    setNameValue(item.name);
    setSuggestions([]);
    const matched = categories.find((cat) => cat.default_slug === item.category_slug);
    if (matched) setCategoryId(matched.id);
    nameRef.current?.focus();
  }

  return (
    <form ref={formRef} action={dispatch} className="mt-3 space-y-2 border-t border-border pt-3">
      <input type="hidden" name="list_id" value={listId} />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={nameRef}
            name="name"
            value={nameValue}
            onChange={handleNameChange}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            placeholder="+ Adicionar item"
            required
            disabled={pending}
            autoComplete="off"
            aria-label="Nome do item"
          />
          {suggestions.length > 0 ? (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              {suggestions.map((s) => (
                <li key={s.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(s);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "Adicionar"}
        </Button>
      </div>

      {/* Category */}
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        Categoria
        <select
          name="category_id"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={pending}
          className={selectClass}
        >
          <option value="">Sem categoria</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </label>

      <Input
        name="notes"
        placeholder="Detalhes (opcional)"
        maxLength={200}
        disabled={pending}
        aria-label="Detalhes do item"
      />

      <button
        type="button"
        onClick={() => setShowExtras((v) => !v)}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        {showExtras ? "Menos opções" : "Mais opções (quantidade, unidade, recompra)"}
      </button>

      {showExtras ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Qtd.
            <Input
              name="quantity"
              type="number"
              min="0.01"
              step="any"
              defaultValue="1"
              className="w-16"
              disabled={pending}
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Unidade
            <select name="unit" defaultValue="un" disabled={pending} className={selectClass}>
              <option value="un">un</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
              <option value="pacote">pacote</option>
              <option value="caixa">caixa</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Recomprar a cada
            <Input
              name="reorder_months"
              type="number"
              min="1"
              max="24"
              step="1"
              placeholder="—"
              className="w-16"
              disabled={pending}
            />
            meses
          </label>
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}

// ---- Edit Item Form (inline) ----
function EditItemForm({
  item,
  categories,
  onCancel,
}: {
  item: ShoppingListItem;
  categories: ShoppingCategory[];
  onCancel: () => void;
}) {
  const [state, dispatch, pending] = useActionState(updateListItem, initialFormState);

  useEffect(() => {
    if (state.status === "success") onCancel();
  }, [state, onCancel]);

  return (
    <form action={dispatch} className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <input type="hidden" name="id" value={item.id} />

      <Input name="name" defaultValue={item.name} required disabled={pending} aria-label="Nome" />

      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        Categoria
        <select
          name="category_id"
          defaultValue={item.category_id ?? ""}
          disabled={pending}
          className={selectClass}
        >
          <option value="">Sem categoria</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Qtd.
          <Input
            name="quantity"
            type="number"
            defaultValue={item.quantity}
            min="0.01"
            step="any"
            className="w-16"
            disabled={pending}
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Unidade
          <select
            name="unit"
            defaultValue={item.unit}
            disabled={pending}
            className={selectClass}
          >
            <option value="un">un</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="l">l</option>
            <option value="ml">ml</option>
            <option value="pacote">pacote</option>
            <option value="caixa">caixa</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Recomprar a cada
          <Input
            name="reorder_months"
            type="number"
            defaultValue={item.reorder_months ?? ""}
            min="1"
            max="24"
            step="1"
            placeholder="—"
            className="w-16"
            disabled={pending}
          />
          meses
        </label>
      </div>

      <Input
        name="notes"
        defaultValue={item.notes ?? ""}
        placeholder="Detalhes (opcional)"
        maxLength={200}
        disabled={pending}
      />

      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ---- Single List Item Row ----
function ListItemRow({
  item,
  categories,
}: {
  item: ShoppingListItem;
  categories: ShoppingCategory[];
}) {
  const [editing, setEditing] = useState(false);
  const [delState, delDispatch, delPending] = useActionState(deleteListItem, initialFormState);

  const monthsAgo = item.last_added_at
    ? Math.floor(
        (Date.now() - new Date(item.last_added_at).getTime()) / (30 * 24 * 60 * 60 * 1000),
      )
    : null;

  if (editing) {
    return (
      <EditItemForm item={item} categories={categories} onCancel={() => setEditing(false)} />
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {item.category?.icon ? `${item.category.icon} ` : ""}
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.quantity} {item.unit}
        </p>
        {item.notes ? <p className="text-xs text-muted-foreground">{item.notes}</p> : null}
        {item.reorder_months ? (
          <p className="text-xs text-muted-foreground">
            {monthsAgo === null
              ? `Recomprar a cada ${item.reorder_months} meses · Nunca adicionado`
              : `Recomprar a cada ${item.reorder_months} meses · há ${monthsAgo} meses`}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Editar item"
        >
          ✏
        </button>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              disabled={delPending}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              aria-label="Remover item"
            >
              ✕
            </button>
          }
          title="Remover item"
          description={`Remover "${item.name}" da lista?`}
          confirmLabel="Remover"
          destructive
          onConfirm={() => {
            const fd = new FormData();
            fd.set("id", item.id);
            delDispatch(fd);
          }}
        />
        {delState.status === "error" && delState.message ? (
          <p className="text-xs text-destructive">{delState.message}</p>
        ) : null}
      </div>
    </div>
  );
}

// ---- Single Named List Card ----
function NamedListCard({
  list,
  categories,
}: {
  list: ShoppingList;
  categories: ShoppingCategory[];
}) {
  const [applyingListId, setApplyingListId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(list.name);

  // Update list name action
  const [updateState, updateDispatch, updatePending] = useActionState(
    updateList,
    initialFormState,
  );
  useEffect(() => {
    if (updateState.status === "success") setEditingName(false);
  }, [updateState]);

  // Delete list action
  const [, delDispatch, delPending] = useActionState(deleteList, initialFormState);

  async function handleApply() {
    setApplyingListId(list.id);
    try {
      const fd = new FormData();
      fd.set("list_id", list.id);
      const result = await applyList(initialFormState, fd);
      setToast({
        message: result.message ?? (result.status === "success" ? "Itens adicionados." : "Erro."),
        kind: result.status === "success" ? "success" : "error",
      });
      setTimeout(() => setToast(null), 4000);
    } catch {
      setToast({ message: "Erro ao adicionar itens.", kind: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setApplyingListId(null);
    }
  }

  const applying = applyingListId === list.id;

  return (
    <details className="rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3">
        {/* List name / edit toggle */}
        <span className="flex-1 font-medium">
          {editingName ? (
            <form
              action={updateDispatch}
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input type="hidden" name="id" value={list.id} />
              <Input
                name="name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                required
                disabled={updatePending}
                autoFocus
                className="h-7 text-sm"
                aria-label="Nome da lista"
              />
              {updateState.status === "error" && updateState.message ? (
                <span className="text-xs text-destructive">{updateState.message}</span>
              ) : null}
              <Button type="submit" size="sm" disabled={updatePending} className="h-7 px-2 text-xs">
                Salvar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditingName(false)}
                disabled={updatePending}
                className="h-7 px-2 text-xs"
              >
                Cancelar
              </Button>
            </form>
          ) : (
            <>
              {list.name}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({list.items.length} {list.items.length === 1 ? "item" : "itens"})
              </span>
            </>
          )}
        </span>

        {/* Actions (stop propagation so clicks don't toggle details) */}
        <span className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
            aria-label="Adicionar à lista de compras"
          >
            {applying ? "Adicionando…" : "Adicionar à compra"}
          </button>

          {!editingName ? (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Editar nome da lista"
            >
              ✏
            </button>
          ) : null}

          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={delPending}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label="Excluir lista"
              >
                ✕
              </button>
            }
            title="Excluir lista"
            description={`Excluir a lista "${list.name}"? Esta ação não pode ser desfeita.`}
            confirmLabel="Excluir"
            destructive
            onConfirm={() => {
              const fd = new FormData();
              fd.set("id", list.id);
              delDispatch(fd);
            }}
          />
        </span>
      </summary>

      {/* Toast */}
      {toast ? (
        <div
          className={`mx-4 mt-2 rounded-md px-3 py-2 text-sm ${
            toast.kind === "success"
              ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {/* Items */}
      <div className="px-4 pb-4 pt-2">
        {list.items.length > 0 ? (
          <div className="divide-y divide-border">
            {list.items.map((item) => (
              <ListItemRow key={item.id} item={item} categories={categories} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>
        )}

        <AddListItemForm listId={list.id} categories={categories} />
      </div>
    </details>
  );
}

// ---- Main Section ----
export function NamedListsSection({ lists, categories }: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Listas salvas</h2>
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="rounded px-2 py-1 text-sm text-primary hover:bg-primary/10"
          >
            + Nova lista
          </button>
        ) : null}
      </div>

      {showCreateForm ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <CreateListForm onSuccess={() => setShowCreateForm(false)} />
          <button
            type="button"
            onClick={() => setShowCreateForm(false)}
            className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {lists.length === 0 && !showCreateForm ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma lista salva. Crie uma para reutilizar combinações de itens.
        </p>
      ) : null}

      <div className="space-y-3">
        {lists.map((list) => (
          <NamedListCard key={list.id} list={list} categories={categories} />
        ))}
      </div>
    </section>
  );
}
