"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addItem } from "@/features/shopping/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import { SHOPPING_CATALOG } from "@/features/shopping/catalog";
import { MISSIONS, MISSION_LABELS, type Mission } from "@/features/shopping/schemas";

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

type PersonalSuggestion = { name: string; category_id: string | null };

type Props = {
  categories: ShoppingCategory[];
  rooms: { id: string; name: string }[];
  personalSuggestions?: PersonalSuggestion[];
  onSuccess?: () => void;
};

export function AddItemForm({ categories, rooms, personalSuggestions = [], onSuccess }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showExtras, setShowExtras] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mission, setMission] = useState<Mission | "">("");
  const [priority, setPriority] = useState<"normal" | "urgente">("normal");
  const [suggestions, setSuggestions] = useState<{ name: string; categoryId: string | null; isPersonal: boolean }[]>([]);

  const personalNames = new Set(personalSuggestions.map((s) => s.name.toLowerCase()));

  const wrappedAdd = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await addItem(prev, fd);
    if (result.status === "success") {
      setNameValue("");
      setCategoryId("");
      setMission("");
      setPriority("normal");
      setShowExtras(false);
      setSuggestions([]);
      onSuccess?.();
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
      const personal = personalSuggestions
        .filter((s) => s.name.toLowerCase().includes(lower))
        .map((s) => ({ name: s.name, categoryId: s.category_id, isPersonal: true }));
      const catalog = SHOPPING_CATALOG
        .filter((s) => s.name.toLowerCase().includes(lower) && !personalNames.has(s.name.toLowerCase()))
        .map((s) => ({
          name: s.name,
          categoryId: categories.find((c) => c.default_slug === s.category_slug)?.id ?? null,
          isPersonal: false,
        }));
      setSuggestions([...personal, ...catalog].slice(0, 8));
    } else {
      setSuggestions([]);
    }
  }

  function selectSuggestion(item: { name: string; categoryId: string | null }) {
    setNameValue(item.name);
    setSuggestions([]);
    if (item.categoryId) setCategoryId(item.categoryId);
    nameRef.current?.focus();
  }

  return (
    <form ref={formRef} action={dispatch} className="space-y-3">
      {/* Name */}
      <div className="relative">
        <Input
          ref={nameRef}
          name="name"
          value={nameValue}
          onChange={handleNameChange}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
          placeholder="Nome do produto…"
          autoComplete="off"
          required
          disabled={pending}
          aria-label="Nome do produto"
          aria-invalid={!!state.fieldErrors?.name}
          className="w-full text-base"
          style={{ height: 44 }}
        />
        {suggestions.length > 0 ? (
          <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {suggestions.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <span className="flex-1">{s.name}</span>
                  {s.isPersonal ? <span className="shrink-0 text-xs text-muted-foreground">★</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {state.fieldErrors?.name ? (
        <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
      ) : null}

      {/* Quantidade + Unidade (visible upfront) */}
      <div className="flex gap-2">
        <label className="flex flex-1 items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">Qtd.</span>
          <Input
            name="quantity"
            type="number"
            min="0.01"
            step="any"
            defaultValue="1"
            disabled={pending}
            aria-label="Quantidade"
            className="flex-1"
            style={{ height: 36 }}
          />
        </label>
        <select name="unit" defaultValue="un" disabled={pending} className={selectClass} aria-label="Unidade">
          <option value="un">un</option>
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="l">l</option>
          <option value="ml">ml</option>
          <option value="pacote">pacote</option>
          <option value="caixa">caixa</option>
        </select>
      </div>

      {/* Toggle extras */}
      <button
        type="button"
        onClick={() => setShowExtras((v) => !v)}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        {showExtras ? "Menos opções ↑" : "Categoria, missão, prioridade… ↓"}
      </button>

      {showExtras ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          {/* Categoria */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-16 shrink-0">Categoria</span>
            <select
              name="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={pending}
              className={selectClass + " flex-1"}
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </label>

          {/* Missão */}
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">Missão</span>
            <input type="hidden" name="mission" value={mission} />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setMission("")}
                style={{
                  height: 28, borderRadius: 8, padding: "0 10px", fontSize: 12,
                  background: mission === "" ? "var(--nav-active)" : "var(--secondary)",
                  color: mission === "" ? "var(--nav-active-ink)" : "var(--muted-foreground)",
                  border: "none",
                }}
              >
                Nenhuma
              </button>
              {MISSIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMission(m)}
                  style={{
                    height: 28, borderRadius: 8, padding: "0 10px", fontSize: 12,
                    background: mission === m ? "var(--nav-active)" : "var(--secondary)",
                    color: mission === m ? "var(--nav-active-ink)" : "var(--muted-foreground)",
                    border: "none",
                  }}
                >
                  {MISSION_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Prioridade */}
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">Prioridade</span>
            <input type="hidden" name="priority" value={priority} />
            <div className="flex gap-1.5">
              {(["normal", "urgente"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  style={{
                    height: 28, borderRadius: 8, padding: "0 10px", fontSize: 12,
                    background: priority === p ? (p === "urgente" ? "#ef4444" : "var(--nav-active)") : "var(--secondary)",
                    color: priority === p ? "white" : "var(--muted-foreground)",
                    border: "none",
                  }}
                >
                  {p === "normal" ? "Normal" : "Urgente"}
                </button>
              ))}
            </div>
          </div>

          {/* Observação */}
          <Input
            name="notes"
            placeholder="Observação (marca, preferência…)"
            maxLength={200}
            disabled={pending}
            aria-label="Observação"
            style={{ height: 36 }}
          />

          {/* Cômodo */}
          {rooms.length > 0 ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-16 shrink-0">Cômodo</span>
              <select name="room_id" defaultValue="" disabled={pending} className={selectClass + " flex-1"}>
                <option value="">Sem cômodo</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full" style={{ height: 44 }}>
        {pending ? "Adicionando…" : "Adicionar à lista"}
      </Button>
    </form>
  );
}
