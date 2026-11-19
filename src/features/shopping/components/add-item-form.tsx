"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addItem } from "@/features/shopping/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function AddItemForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showExtras, setShowExtras] = useState(false);
  // Finding 6: controlled input so React 19 auto-reset doesn't clear value on error
  const [nameValue, setNameValue] = useState("");

  // Finding 2: wrappedAdd moves setShowExtras out of useEffect
  // Finding 6: nameValue is cleared here on success
  const wrappedAdd = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await addItem(prev, fd);
    if (result.status === "success") {
      setShowExtras(false);
      setNameValue("");
    }
    return result;
  };

  const [state, dispatch, pending] = useActionState(wrappedAdd, initialFormState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      nameRef.current?.focus();
      // setShowExtras(false) moved to wrappedAdd to satisfy react-hooks/set-state-in-effect
    }
  }, [state]);

  return (
    <form ref={formRef} action={dispatch} className="space-y-2">
      <div className="flex gap-2">
        <Input
          ref={nameRef}
          name="name"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          placeholder="Adicionar item…"
          autoFocus
          autoComplete="off"
          required
          disabled={pending}
          aria-label="Nome do item"
          aria-invalid={!!state.fieldErrors?.name}
          className="flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>

      {state.fieldErrors?.name ? (
        <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
      ) : null}

      {/* Toggle optional fields */}
      <button
        type="button"
        onClick={() => setShowExtras((v) => !v)}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        {showExtras ? "Menos opções" : "Mais opções (categoria, quantidade, unidade)"}
      </button>

      {showExtras ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Categoria
            <select name="category" defaultValue="outros" disabled={pending} className={selectClass}>
              <option value="alimentacao">Alimentação</option>
              <option value="cozinha">Cozinha</option>
              <option value="higiene">Higiene</option>
              <option value="lavanderia">Lavanderia</option>
              <option value="limpeza">Limpeza</option>
              <option value="outros">Outros</option>
            </select>
          </label>

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
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
