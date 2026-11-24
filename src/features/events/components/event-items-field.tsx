"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { normalizeName } from "@/features/shopping/dedupe";
import { ProductAutocomplete } from "@/features/shopping/components/product-autocomplete";
import type { ProductSuggestion, ShoppingUnit, SuggestionSources } from "@/features/shopping/suggest";
import { MAX_EVENT_ITEMS, type EventItemInput, type LinkedEventItem } from "@/features/events/event-items";

const UNITS: ShoppingUnit[] = ["un", "kg", "g", "l", "ml", "pacote", "caixa"];

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

type Props = {
  sources: SuggestionSources;
  /** Itens que o evento já pôs na lista de compras (edição). */
  linked?: LinkedEventItem[];
  /** Tira um item pendente vinculado do evento E da lista de compras (campo `id`). */
  removeAction?: (_: FormState, fd: FormData) => Promise<FormState>;
  /** false = sem permissão de Compras: o botão de remover fica desabilitado. */
  canRemove?: boolean;
};

/** "Itens / Compras necessárias": o que entra na lista de compras quando o evento for salvo. */
export function EventItemsField({ sources, linked = [], removeAction, canRemove = true }: Props) {
  const [items, setItems] = useState<EventItemInput[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<ShoppingUnit>("un");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const full = items.length >= MAX_EVENT_ITEMS;
  const visibleLinked = linked.filter((l) => !removedIds.includes(l.id));
  const hasRemovable = !!removeAction && visibleLinked.some((l) => !l.is_purchased);

  async function removeLinked(id: string) {
    if (!removeAction) return;
    setRemoveError(null);
    const fd = new FormData();
    fd.set("id", id);
    const result = await removeAction(initialFormState, fd);
    if (result.status === "error") setRemoveError(result.message ?? "Não foi possível remover o item.");
    else setRemovedIds((prev) => [...prev, id]);
  }

  function addDraft() {
    const trimmed = name.trim();
    const qty = Number(quantity);
    if (!trimmed || !Number.isFinite(qty) || qty <= 0 || full) return;
    setItems((prev) => {
      const key = normalizeName(trimmed);
      const idx = prev.findIndex((i) => normalizeName(i.name) === key && i.unit === unit);
      if (idx >= 0) {
        const next = [...prev];
        const cur = next[idx]!;
        next[idx] = { ...cur, quantity: Math.min(Math.round((cur.quantity + qty) * 100) / 100, 9999) };
        return next;
      }
      return [...prev, { name: trimmed, quantity: qty, unit, category_id: categoryId }];
    });
    setName("");
    setQuantity("1");
    setUnit("un");
    setCategoryId(null);
  }

  function selectSuggestion(s: ProductSuggestion) {
    setName(s.name);
    setCategoryId(s.categoryId);
    if (s.unit) setUnit(s.unit);
  }

  return (
    <section className="rounded-xl border border-border bg-secondary/50 p-3.5" aria-labelledby="event-items-title">
      <h3 id="event-items-title" className="text-sm font-semibold">Itens / Compras necessárias</h3>
      <p className="mb-3 text-xs text-muted-foreground">Entram na lista de compras quando você salvar o evento.</p>

      <input type="hidden" name="items" value={JSON.stringify(items)} />

      {visibleLinked.length > 0 ? (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold text-foreground">Já na lista</p>
          <ul className="space-y-1">
            {visibleLinked.map((l) => (
              <li key={l.id} className="flex items-center gap-2 text-[13px]">
                <CalendarDays size={13} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {l.name} · {l.quantity} {l.unit}
                </span>
                {l.is_purchased ? <span className="text-xs text-muted-foreground">Comprado</span> : null}
                {!l.is_purchased && removeAction ? (
                  <ConfirmDialog
                    trigger={
                      <button
                        type="button"
                        disabled={!canRemove}
                        aria-label={`Remover ${l.name} da lista de compras`}
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                      >
                        <X size={14} strokeWidth={1.75} aria-hidden />
                      </button>
                    }
                    title="Remover da lista de compras?"
                    description={`“${l.name}” sai deste evento e da lista de compras.`}
                    confirmLabel="Remover"
                    destructive
                    onConfirm={() => removeLinked(l.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
          {hasRemovable && !canRemove ? (
            <p className="mt-1 text-xs text-muted-foreground">Sem permissão para Compras.</p>
          ) : null}
          {removeError ? (
            <p role="alert" className="mt-1 text-xs text-destructive">{removeError}</p>
          ) : null}
          <Link href="/compras" className="mt-1 inline-block text-xs font-semibold text-add-ink underline-offset-4 hover:underline">
            Ver na lista de compras
          </Link>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li
              key={`${normalizeName(i.name)}|${i.unit}`}
              className="inline-flex items-center gap-1 rounded-[10px] border border-border bg-card py-1 pl-2.5 pr-1 text-[13px]"
            >
              <span>{`${i.name} · ${i.quantity} ${i.unit}`}</span>
              <button
                type="button"
                aria-label={`Remover ${i.name}`}
                onClick={() => setItems((prev) => prev.filter((p) => p !== i))}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X size={14} strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {full ? <p className="mb-2 text-xs text-muted-foreground">No máximo {MAX_EVENT_ITEMS} itens por evento.</p> : null}

      {/* Enter adiciona o item (em vez de enviar o formulário do evento). */}
      <div
        className="flex flex-wrap items-start gap-2"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.defaultPrevented && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            addDraft();
          }
        }}
      >
        <div className="min-w-[160px] flex-1">
          <ProductAutocomplete
            name="item-rascunho"
            value={name}
            onValueChange={(v) => {
              setName(v);
              setCategoryId(null);
            }}
            onSelect={selectSuggestion}
            sources={sources}
            placeholder="Ex.: leite de amêndoas"
            inputProps={{
              "aria-label": "Produto do evento",
              disabled: full,
              maxLength: 120,
              className: "w-full text-sm",
              style: { height: 40 },
            }}
          />
        </div>
        <Input
          type="number"
          min="0.01"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={full}
          aria-label="Quantidade do item"
          className="w-20"
          style={{ height: 40 }}
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as ShoppingUnit)}
          disabled={full}
          className={selectClass}
          style={{ height: 40 }}
          aria-label="Unidade do item"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={addDraft}
          disabled={full}
          aria-label="Adicionar item"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-add px-3.5 font-semibold text-add-foreground hover:bg-add-hover focus-visible:outline-2 disabled:opacity-60"
          style={{ height: 40, fontSize: 13.5 }}
        >
          <Plus size={16} strokeWidth={1.75} aria-hidden />
          Adicionar
        </button>
      </div>
    </section>
  );
}
