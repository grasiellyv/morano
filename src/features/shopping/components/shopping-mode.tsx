"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ShoppingItem } from "@/features/shopping/queries";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import { togglePurchased, finalizarCompra } from "@/features/shopping/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

type Unit = ShoppingItem["unit"];
const UNIT_LABELS: Record<Unit, string> = {
  un: "un", kg: "kg", g: "g", l: "l", ml: "ml", pacote: "pacote", caixa: "caixa",
};

type Props = {
  pending: ShoppingItem[];
  purchased: ShoppingItem[];
  categories: ShoppingCategory[];
};

export function ShoppingMode({ pending, purchased, categories }: Props) {
  const router = useRouter();
  const allItems = [...pending, ...purchased];
  const purchasedCount = purchased.length;
  const totalCount = allItems.length;
  const progress = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0;

  // Group all items by category, pending first within each group
  function groupByCategory(items: ShoppingItem[]) {
    const groups = new Map<string, { label: string; icon: string; items: ShoppingItem[] }>();
    for (const item of items) {
      const key = item.category?.id ?? "none";
      if (!groups.has(key)) {
        groups.set(key, {
          label: item.category?.name ?? "Sem categoria",
          icon: item.category?.icon ?? "📦",
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    }
    // Sort: pending before purchased within each group
    for (const g of groups.values()) {
      g.items.sort((a, b) => Number(a.is_purchased) - Number(b.is_purchased));
    }
    // Order groups by categories list
    const ordered: { key: string; label: string; icon: string; items: ShoppingItem[] }[] = [];
    for (const cat of categories) {
      const g = groups.get(cat.id);
      if (g) ordered.push({ key: cat.id, ...g });
    }
    const noCat = groups.get("none");
    if (noCat) ordered.push({ key: "none", ...noCat });
    return ordered;
  }

  const groups = groupByCategory(allItems);

  // Optimistic toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggle(item: ShoppingItem) {
    setTogglingId(item.id);
    const fd = new FormData();
    fd.append("id", item.id);
    fd.append("is_purchased", String(!item.is_purchased));
    const result = await togglePurchased(initialFormState, fd);
    if (result.status === "error") toast.error(result.message ?? "Erro ao atualizar item");
    setTogglingId(null);
  }

  const [finalizando, setFinalizando] = useState(false);

  async function handleFinalize() {
    setFinalizando(true);
    const result = await finalizarCompra(initialFormState, new FormData());
    setFinalizando(false);
    if (result.status === "error") {
      toast.error(result.message ?? "Erro ao finalizar compra");
    } else {
      toast.success(result.message ?? "Compra finalizada!");
      router.push("/compras");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", paddingBottom: 90 }}>
      {/* Progress header */}
      <div style={{ padding: "16px 20px 12px", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="mb-1 flex items-baseline gap-2">
          <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{purchasedCount}</span>
          <span style={{ fontSize: 16, color: "var(--muted-foreground)" }}>/ {totalCount}</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 10 }}>
          Itens encontrados e marcados
        </p>
        <div style={{ height: 6, borderRadius: 3, background: "var(--secondary)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%", borderRadius: 3,
              background: "var(--nav-active)",
              width: `${progress}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Items by category */}
      <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>
        {groups.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--muted-foreground)", marginTop: 48, fontSize: 15 }}>
            Lista vazia
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.key}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {group.icon} {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggle(item)}
                      disabled={togglingId === item.id}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 14,
                        borderRadius: 14, border: "1px solid var(--border)",
                        background: item.is_purchased ? "var(--secondary)" : "var(--card)",
                        padding: "12px 16px", textAlign: "left", cursor: "pointer",
                        opacity: togglingId === item.id ? 0.5 : 1,
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Circle checkbox */}
                      <div
                        style={{
                          width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                          border: item.is_purchased ? "none" : "1.5px solid var(--muted-foreground)",
                          background: item.is_purchased ? "var(--nav-active)" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {item.is_purchased ? (
                          <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="white" strokeWidth={2.2} aria-hidden>
                            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span style={{
                          fontSize: 15, fontWeight: 500,
                          color: item.is_purchased ? "var(--muted-foreground)" : "var(--foreground)",
                          textDecoration: item.is_purchased ? "line-through" : "none",
                          display: "block",
                        }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                          {item.quantity} {UNIT_LABELS[item.unit]}
                          {item.notes ? ` · ${item.notes}` : ""}
                        </span>
                      </div>
                      {item.priority === "urgente" ? (
                        <span style={{ flexShrink: 0, borderRadius: 6, background: "#ef4444", color: "white", padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>!</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          padding: "12px 20px 24px",
          background: "var(--background)",
          borderTop: "1px solid var(--border)",
        }}
      >
        {purchasedCount > 0 ? (
          <ConfirmDialog
            trigger={
              <Button className="w-full" style={{ height: 50, fontSize: 16, fontWeight: 600 }} disabled={finalizando}>
                {finalizando ? "Finalizando…" : `Finalizar compra (${purchasedCount} iten${purchasedCount !== 1 ? "s" : ""})`}
              </Button>
            }
            title="Finalizar compra"
            description={`Registra a compra de ${purchasedCount} iten${purchasedCount !== 1 ? "s" : ""} no histórico e os remove da lista ativa. Os itens ainda pendentes permanecem.`}
            confirmLabel="Finalizar"
            onConfirm={handleFinalize}
          />
        ) : (
          <Button variant="outline" className="w-full" style={{ height: 50, fontSize: 15 }} onClick={() => router.push("/compras")}>
            ← Voltar para lista
          </Button>
        )}
      </div>
    </div>
  );
}
