"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
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
import { ChevronDown, Pencil, Plus, X } from "lucide-react";
import { MISSION_LABELS } from "@/features/shopping/schemas";
import { ListLinkFields } from "@/features/shopping/components/list-link-fields";
import { CategoryIcon } from "@/features/shopping/category-icon";

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

type Props = {
  lists: ShoppingList[];
  categories: ShoppingCategory[];
};

// ---- Create List Form ----
function CreateListForm({ categories, onSuccess }: { categories: ShoppingCategory[]; onSuccess: () => void }) {
  const [state, dispatch, pending] = useActionState(createList, initialFormState);

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={dispatch} className="flex flex-wrap items-center gap-2 py-2">
      <Input
        name="name"
        placeholder="Nome da lista (ex.: Churrasco)"
        required
        disabled={pending}
        autoFocus
        className="flex-1"
        aria-label="Nome da nova lista"
      />
      <ListLinkFields categories={categories} defaultMission={null} defaultCategoryId={null} disabled={pending} />
      {state.fieldErrors?.name ? (
        <p className="w-full text-xs text-destructive">{state.fieldErrors.name}</p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p className="w-full text-xs text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit" size="sm" variant="add" disabled={pending}>
        <Plus aria-hidden strokeWidth={1.75} />
        {pending ? "Criando…" : "Criar lista"}
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
        <Button type="submit" size="sm" variant="add" disabled={pending}>
          <Plus aria-hidden strokeWidth={1.75} />
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
              {cat.name}
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
              {cat.name}
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
        <p className="flex items-center gap-1.5 text-sm">
          {item.category?.icon ? <CategoryIcon icon={item.category.icon} size={14} className="shrink-0 text-muted-foreground" /> : null}
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
          <Pencil size={15} strokeWidth={1.75} aria-hidden />
        </button>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              disabled={delPending}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              aria-label="Remover item"
            >
              <X size={15} strokeWidth={1.75} aria-hidden />
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

// ---- Editar nome, missão e categoria da lista ----
function EditListForm({
  list,
  categories,
  onDone,
}: {
  list: ShoppingList;
  categories: ShoppingCategory[];
  onDone: () => void;
}) {
  const [state, dispatch, pending] = useActionState(updateList, initialFormState);
  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form action={dispatch} className="space-y-2 rounded-xl border border-border bg-secondary/40 p-3">
      <input type="hidden" name="id" value={list.id} />
      <Input name="name" defaultValue={list.name} required disabled={pending} aria-label="Nome da lista" />
      <ListLinkFields
        categories={categories}
        defaultMission={list.mission}
        defaultCategoryId={list.category_id}
        disabled={pending}
      />
      {state.fieldErrors?.name ? <p className="text-xs text-destructive">{state.fieldErrors.name}</p> : null}
      {state.fieldErrors?.category_id ? <p className="text-xs text-destructive">{state.fieldErrors.category_id}</p> : null}
      {state.status === "error" && state.message ? <p className="text-xs text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>Salvar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={pending}>Cancelar</Button>
      </div>
    </form>
  );
}

// ---- Single Smart List Card ----
function NamedListCard({
  list,
  categories,
}: {
  list: ShoppingList;
  categories: ShoppingCategory[];
}) {
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [editing, setEditing] = useState(false);
  const closeEditing = useCallback(() => setEditing(false), []);

  // Delete list action
  const [delState, delDispatch, delPending] = useActionState(deleteList, initialFormState);

  async function handleApply() {
    setApplying(true);
    try {
      const fd = new FormData();
      fd.set("list_id", list.id);
      const result = await applyList(initialFormState, fd);
      setToast({
        message: result.message ?? (result.status === "success" ? "Itens adicionados." : "Erro."),
        kind: result.status === "success" ? "success" : "error",
      });
    } catch {
      setToast({ message: "Erro ao adicionar itens.", kind: "error" });
    } finally {
      setApplying(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  const count = list.items.length;

  return (
    <details className="group rounded-2xl border border-border bg-card">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{list.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{count} {count === 1 ? "item" : "itens"}</span>
            {list.mission ? (
              <span className="rounded-md bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                {MISSION_LABELS[list.mission]}
              </span>
            ) : null}
            {list.category ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                <CategoryIcon icon={list.category.icon} size={12} />
                {list.category.name}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
        />
      </summary>

      <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={handleApply}
          disabled={applying || count === 0}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-add text-[14px] font-semibold text-add-foreground hover:bg-add-hover disabled:opacity-50"
          aria-label="Adicionar à lista de compras"
        >
          <Plus size={16} strokeWidth={1.75} aria-hidden />
          {applying ? "Adicionando…" : "Adicionar à lista de compras"}
        </button>

        {toast ? (
          <p
            role="status"
            className={`rounded-md px-3 py-2 text-sm ${
              toast.kind === "success" ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-destructive/10 text-destructive"
            }`}
          >
            {toast.message}
          </p>
        ) : null}

        {count > 0 ? (
          <div className="divide-y divide-border">
            {list.items.map((item) => (
              <ListItemRow key={item.id} item={item} categories={categories} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>
        )}

        <AddListItemForm listId={list.id} categories={categories} />

        {editing ? (
          <EditListForm list={list} categories={categories} onDone={closeEditing} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} aria-label="Editar lista">
              <Pencil aria-hidden strokeWidth={1.75} />
              Editar lista
            </Button>
            <ConfirmDialog
              trigger={
                <Button type="button" size="sm" variant="ghost" disabled={delPending} className="text-destructive hover:text-destructive" aria-label="Excluir lista">
                  <X aria-hidden strokeWidth={1.75} />
                  Excluir lista
                </Button>
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
            {delState.status === "error" && delState.message ? (
              <p className="text-xs text-destructive">{delState.message}</p>
            ) : null}
          </div>
        )}
      </div>
    </details>
  );
}

// ---- Main Section ----
export function NamedListsSection({ lists, categories }: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const closeCreate = useCallback(() => setShowCreateForm(false), []);

  return (
    <section className="space-y-3" aria-labelledby="listas-inteligentes">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="listas-inteligentes" className="text-base font-semibold">Listas inteligentes</h2>
          <p className="text-xs text-muted-foreground">
            Salve combinações (Churrasco, Compras do mês…) e jogue tudo na lista de compras com um toque.
          </p>
        </div>
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-add px-3 py-2 text-sm font-semibold text-add-foreground hover:bg-add-hover"
          >
            <Plus size={16} strokeWidth={1.75} aria-hidden />
            Nova lista
          </button>
        ) : null}
      </div>

      {showCreateForm ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <CreateListForm categories={categories} onSuccess={closeCreate} />
          <button
            type="button"
            onClick={closeCreate}
            className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {lists.length === 0 && !showCreateForm ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma lista inteligente ainda. Crie uma aqui ou a partir dos itens mais pedidos.
        </p>
      ) : null}

      <div className="space-y-2">
        {lists.map((list) => (
          <NamedListCard key={list.id} list={list} categories={categories} />
        ))}
      </div>
    </section>
  );
}
