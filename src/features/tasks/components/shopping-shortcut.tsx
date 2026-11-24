"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { addItem as addShoppingItem } from "@/features/shopping/actions";
import { initialFormState } from "@/features/auth/form-state";
import { ProductAutocomplete } from "@/features/shopping/components/product-autocomplete";
import type { ProductSuggestion, SuggestionSources } from "@/features/shopping/suggest";

const icon = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** "Precisa de algum produto?" — adiciona à lista de compras sem sair da tarefa. */
export function ShoppingShortcut({
  taskTitle,
  roomId,
  sources,
}: {
  taskTitle: string;
  roomId: string | null;
  sources: SuggestionSources;
}) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [name, setName] = useState("");
  // Categoria/unidade só valem enquanto o texto é o da sugestão escolhida.
  const [picked, setPicked] = useState<ProductSuggestion | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, dispatch, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof addShoppingItem>>, fd: FormData) => {
      const res = await addShoppingItem(prev, fd);
      if (res.status === "success") {
        const added = String(fd.get("name") ?? "");
        setAdded((a) => [...a, added]);
        setName("");
        setPicked(null);
        formRef.current?.reset();
        inputRef.current?.focus();
      }
      return res;
    },
    initialFormState,
  );

  return (
    <section
      aria-labelledby="compras-title"
      className="mt-6 rounded-2xl"
      style={{ background: "var(--secondary)", padding: "14px 16px" }}
    >
      <h2 id="compras-title" className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
        <svg {...icon}>
          <path d="M5 10h14l-1.5 9a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7z" /><path d="M9 10l3-6 3 6M3 10h18" />
        </svg>
        Precisa de algum produto?
      </h2>
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
        Adicione itens à lista de compras sem sair da tarefa.
      </p>

      {added.length > 0 ? (
        <p role="status" style={{ fontSize: 13, marginTop: 8 }}>
          Na lista: {added.join(", ")}.{" "}
          <Link href="/compras" className="font-medium underline underline-offset-4">Ver lista</Link>
        </p>
      ) : null}

      {open ? (
        <form ref={formRef} action={dispatch} className="mt-3 flex items-start gap-2">
          <input type="hidden" name="notes" value={`Para: ${taskTitle}`.slice(0, 200)} />
          {roomId ? <input type="hidden" name="room_id" value={roomId} /> : null}
          <input type="hidden" name="mission" value="reposicao" />
          {picked?.categoryId ? <input type="hidden" name="category_id" value={picked.categoryId} /> : null}
          {picked?.unit ? <input type="hidden" name="unit" value={picked.unit} /> : null}
          <div className="min-w-0 flex-1">
            <ProductAutocomplete
              name="name"
              value={name}
              onValueChange={(v) => {
                setName(v);
                setPicked(null);
              }}
              onSelect={(s) => {
                setName(s.name);
                setPicked(s);
                inputRef.current?.focus();
              }}
              sources={sources}
              placeholder="Ex.: detergente"
              inputRef={inputRef}
              inputProps={{
                required: true,
                maxLength: 120,
                autoFocus: true,
                "aria-label": "Produto",
                className: "min-w-0 flex-1 rounded-lg border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                style: { height: 40, fontSize: 15, background: "var(--card)" },
              }}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-lg bg-add px-4 font-semibold text-add-foreground hover:bg-add-hover focus-visible:outline-2 disabled:opacity-60"
            style={{ height: 40, fontSize: 13.5 }}
          >
            {pending ? "…" : "Adicionar"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 flex items-center gap-1.5 rounded-lg px-1 font-semibold text-add-ink hover:underline focus-visible:outline-2"
          style={{ fontSize: 14, minHeight: 36 }}
        >
          <svg {...icon} width={15} height={15} strokeWidth={1.75}><path d="M12 5v14M5 12h14" /></svg>
          Adicionar à lista
        </button>
      )}
      {state.status === "error" ? (
        <p role="alert" className="mt-2 text-destructive" style={{ fontSize: 12.5 }}>
          {state.fieldErrors?.name ?? state.message}
        </p>
      ) : null}
    </section>
  );
}
