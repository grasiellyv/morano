"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, ChevronDown, ListPlus, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { addItem } from "@/features/shopping/actions";
import { createList } from "@/features/shopping/actions-lists";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Input } from "@/components/ui/input";
import { normalizeName, type HistoryProduct } from "@/features/shopping/dedupe";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import { ListLinkFields } from "@/features/shopping/components/list-link-fields";

function Row({
  product,
  inList,
  selected,
  onToggle,
}: {
  product: HistoryProduct;
  inList: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const done = inList || added;

  function add() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", product.name);
      fd.set("quantity", String(product.quantity));
      fd.set("unit", product.unit);
      if (product.category_id) fd.set("category_id", product.category_id);
      const res = await addItem(initialFormState, fd);
      if (res.status === "error") {
        toast.error(res.message ?? "Não foi possível adicionar.");
        return;
      }
      setAdded(true);
      toast.success(res.message ?? "Item adicionado.");
    });
  }

  return (
    <li className="flex items-center gap-1 pr-3.5" style={{ borderTop: "1px solid var(--border)" }}>
      {/* Área de toque de 44px; a caixa visual é menor */}
      <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Selecionar ${product.name}`}
          className="size-5 cursor-pointer accent-[var(--add)]"
        />
      </label>
      <div className="min-w-0 flex-1 py-2.5">
        <p className="truncate text-[14px] font-medium">{product.name}</p>
        <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
          {product.quantity} {product.unit} · comprado {product.times}×
        </p>
      </div>
      {done ? (
        <span className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: "var(--add-ink)" }}>
          <Check size={15} aria-hidden />
          Na lista
        </span>
      ) : (
        <button
          type="button"
          onClick={add}
          disabled={pending}
          aria-label={`Adicionar ${product.name} à lista`}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-add px-3 text-[13px] font-semibold text-add-foreground hover:bg-add-hover disabled:opacity-50"
        >
          <Plus size={15} aria-hidden />
          {pending ? "…" : "Adicionar"}
        </button>
      )}
    </li>
  );
}

/** Nome, missão e categoria da nova lista inteligente (os itens vão em `items`, em JSON). */
function CreateSmartListForm({
  products,
  categories,
  onCreated,
  onCancel,
}: {
  products: HistoryProduct[];
  categories: ShoppingCategory[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [state, dispatch, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await createList(prev, fd);
    if (res.status === "success") {
      toast.success(res.message ?? "Lista criada.");
      onCreated();
    }
    return res;
  }, initialFormState);

  const items = products.map((p) => ({ name: p.name, quantity: p.quantity, unit: p.unit, category_id: p.category_id }));

  return (
    <form action={dispatch} className="space-y-2 px-3.5 pb-3.5 pt-1">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <Input
        name="name"
        required
        maxLength={100}
        placeholder="Nome da lista (ex.: Compras do mês)"
        disabled={pending}
        aria-label="Nome da lista inteligente"
        autoFocus
      />
      <ListLinkFields categories={categories} defaultMission={null} defaultCategoryId={null} disabled={pending} />
      {state.fieldErrors?.name ? <p className="text-xs text-destructive">{state.fieldErrors.name}</p> : null}
      {state.fieldErrors?.items ? <p className="text-xs text-destructive">{state.fieldErrors.items}</p> : null}
      {state.status === "error" && state.message ? <p className="text-xs text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-add px-4 text-[13.5px] font-semibold text-add-foreground hover:bg-add-hover disabled:opacity-50"
        >
          <ListPlus size={16} strokeWidth={1.75} aria-hidden />
          {pending ? "Criando…" : "Criar lista"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-lg px-3 text-[13.5px] font-medium text-muted-foreground hover:bg-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * "Mais pedidos": os produtos que a casa mais compra (em mais compras finalizadas primeiro).
 * Dá para repor um item com um toque ou escolher vários e criar uma lista inteligente com eles.
 */
export function HistoryRecover({
  products,
  pendingNames,
  categories,
}: {
  products: HistoryProduct[];
  pendingNames: string[];
  categories: ShoppingCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  if (products.length === 0) return null;
  const inList = new Set(pendingNames.map(normalizeName));

  const chosen = products.filter((p) => selected.has(normalizeName(p.name)));

  function toggle(p: HistoryProduct) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = normalizeName(p.name);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function reset() {
    setSelected(new Set());
    setCreating(false);
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-border" style={{ background: "var(--card)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <TrendingUp size={18} aria-hidden />
        <span className="flex-1">
          <span className="block text-sm font-semibold">Mais pedidos</span>
          <span className="block text-xs text-muted-foreground">Itens que você mais compra</span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={"transition-transform duration-200 " + (open ? "rotate-180" : "")}
        />
      </button>
      {open ? (
        <>
          <ul>
            {products.map((p) => (
              <Row
                key={normalizeName(p.name)}
                product={p}
                inList={inList.has(normalizeName(p.name))}
                selected={selected.has(normalizeName(p.name))}
                onToggle={() => toggle(p)}
              />
            ))}
          </ul>
          {chosen.length > 0 ? (
            <div style={{ borderTop: "1px solid var(--border)", background: "var(--secondary)" }}>
              {creating ? (
                <CreateSmartListForm products={chosen} categories={categories} onCreated={reset} onCancel={() => setCreating(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex min-h-12 w-full items-center justify-center gap-2 px-3.5 text-[13.5px] font-semibold"
                  style={{ color: "var(--add-ink)" }}
                >
                  <ListPlus size={17} strokeWidth={1.75} aria-hidden />
                  {`Criar lista inteligente com ${chosen.length} ${chosen.length === 1 ? "item" : "itens"}`}
                </button>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
