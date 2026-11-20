"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addItem } from "@/features/shopping/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import { SHOPPING_CATALOG } from "@/features/shopping/catalog";

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

type Props = {
  categories: ShoppingCategory[];
  rooms: { id: string; name: string }[];
};

export function AddItemForm({ categories, rooms }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showExtras, setShowExtras] = useState(false);
  // Controlled input so React 19 auto-reset doesn't clear value on error
  const [nameValue, setNameValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [suggestions, setSuggestions] = useState<typeof SHOPPING_CATALOG>([]);

  // wrappedAdd resets extra state on success
  const wrappedAdd = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await addItem(prev, fd);
    if (result.status === "success") {
      setShowExtras(false);
      setNameValue("");
      setCategoryId("");
      setSuggestions([]);
    }
    return result;
  };

  const [state, dispatch, pending] = useActionState(wrappedAdd, initialFormState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      nameRef.current?.focus();
    }
  }, [state]);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setNameValue(val);
    if (val.length >= 2) {
      const lower = val.toLowerCase();
      const filtered = SHOPPING_CATALOG.filter((item) =>
        item.name.toLowerCase().includes(lower),
      ).slice(0, 8);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }

  function selectSuggestion(item: (typeof SHOPPING_CATALOG)[number]) {
    setNameValue(item.name);
    setSuggestions([]);
    // Auto-fill category by matching category_slug → ShoppingCategory.default_slug
    const matched = categories.find((cat) => cat.default_slug === item.category_slug);
    if (matched) {
      setCategoryId(matched.id);
    }
    nameRef.current?.focus();
  }

  return (
    <form ref={formRef} action={dispatch} className="space-y-2">
      {/* Name + submit */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={nameRef}
            name="name"
            value={nameValue}
            onChange={handleNameChange}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            placeholder="Adicionar item…"
            autoFocus
            autoComplete="off"
            required
            disabled={pending}
            aria-label="Nome do item"
            aria-invalid={!!state.fieldErrors?.name}
            className="w-full"
          />

          {/* Autocomplete suggestions */}
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

        <Button type="submit" disabled={pending}>
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>

      {state.fieldErrors?.name ? (
        <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
      ) : null}

      {/* Category select (always visible) */}
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

      {/* Notes field (always visible) */}
      <Input
        name="notes"
        placeholder="Detalhes (ex: sem lactose, marca preferida)"
        maxLength={200}
        disabled={pending}
        aria-label="Detalhes do item"
      />

      {/* Toggle optional fields */}
      <button
        type="button"
        onClick={() => setShowExtras((v) => !v)}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        {showExtras ? "Menos opções" : "Mais opções (quantidade, unidade)"}
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

          {rooms.length > 0 ? (
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              Cômodo
              <select name="room_id" defaultValue="" disabled={pending} className={selectClass}>
                <option value="">Sem cômodo</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
