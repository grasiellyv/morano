"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, History, Plus } from "lucide-react";
import { toast } from "sonner";
import { addItem } from "@/features/shopping/actions";
import { initialFormState } from "@/features/auth/form-state";
import { normalizeName, type HistoryProduct } from "@/features/shopping/dedupe";

function Row({ product, inList }: { product: HistoryProduct; inList: boolean }) {
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
    <li className="flex items-center gap-3 px-3.5 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{product.name}</p>
        <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
          {product.quantity} {product.unit}
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

/** Reaproveita produtos de compras já finalizadas, sem digitar de novo. */
export function HistoryRecover({
  products,
  pendingNames,
}: {
  products: HistoryProduct[];
  pendingNames: string[];
}) {
  const [open, setOpen] = useState(false);
  if (products.length === 0) return null;
  const inList = new Set(pendingNames.map(normalizeName));

  return (
    <section
      className="overflow-hidden rounded-[16px] border border-border"
      style={{ background: "var(--card)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <History size={18} aria-hidden />
        <span className="flex-1">
          <span className="block text-sm font-semibold">Recuperar do histórico</span>
          <span className="block text-xs text-muted-foreground">Itens de compras anteriores</span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={"transition-transform duration-200 " + (open ? "rotate-180" : "")}
        />
      </button>
      {open ? (
        <ul>
          {products.map((p) => (
            <Row key={normalizeName(p.name)} product={p} inList={inList.has(normalizeName(p.name))} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
