"use client";

import { useState, useDeferredValue } from "react";
import type { ShoppingItem } from "@/features/shopping/queries";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import type { ShoppingList } from "@/features/shopping/queries-lists";
import { MISSIONS, MISSION_LABELS, type Mission } from "@/features/shopping/schemas";
import { ShoppingItemRow } from "@/features/shopping/components/shopping-item-row";
import { AddItemForm } from "@/features/shopping/components/add-item-form";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/empty-state";
import { ManageCategoriesDialog } from "@/features/shopping/components/manage-categories-dialog";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { clearPurchased } from "@/features/shopping/actions";
import { initialFormState } from "@/features/auth/form-state";
import Link from "next/link";

type Props = {
  pending: ShoppingItem[];
  purchased: ShoppingItem[];
  categories: ShoppingCategory[];
  rooms: { id: string; name: string }[];
  lists: ShoppingList[];
};

function chipStyle(active: boolean, accent?: string): React.CSSProperties {
  if (active) {
    return {
      height: 32, borderRadius: 10, padding: "0 14px", fontSize: 13, fontWeight: 500, border: "none",
      background: accent ?? "var(--nav-active)", color: "white",
    };
  }
  return {
    height: 32, borderRadius: 10, padding: "0 14px", fontSize: 13, fontWeight: 500, border: "none",
    background: "var(--secondary)", color: "var(--muted-foreground)",
  };
}

function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  return fullName.split(" ")[0] ?? fullName;
}

export function ShoppingList({ pending, purchased, categories, rooms, lists }: Props) {
  const [filterMission, setFilterMission] = useState<Mission | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const deferredQuery = useDeferredValue(searchQuery);

  const personalSuggestions = Array.from(
    new Map(
      lists.flatMap((l) => l.items).map((item) => [item.name.toLowerCase(), { name: item.name, category_id: item.category_id }])
    ).values()
  );

  function matchesFilters(item: ShoppingItem) {
    if (filterMission && item.mission !== filterMission) return false;
    if (filterCategoryId && item.category_id !== filterCategoryId) return false;
    if (deferredQuery && !item.name.toLowerCase().includes(deferredQuery.toLowerCase())) return false;
    return true;
  }

  const allItems = [...pending, ...purchased];
  const filteredPending = pending.filter(matchesFilters);
  const filteredPurchased = purchased.filter(matchesFilters);

  // Which missions have items (for chip count)
  const missionCounts = MISSIONS.reduce<Record<Mission, number>>((acc, m) => {
    acc[m] = allItems.filter((i) => i.mission === m).length;
    return acc;
  }, { abastecimento: 0, reposicao: 0, ocasioes: 0 });

  // Active categories in current filtered set
  const relevantItems = filterMission ? allItems.filter((i) => i.mission === filterMission) : allItems;
  const activeCategories = categories.filter((cat) =>
    relevantItems.some((item) => item.category_id === cat.id)
  );

  // Group pending items by category
  function groupByCategory(items: ShoppingItem[]) {
    const groups = new Map<string, { label: string; icon: string; items: ShoppingItem[] }>();
    // First pass: items with category
    for (const item of items) {
      if (item.category) {
        if (!groups.has(item.category.id)) {
          groups.set(item.category.id, { label: item.category.name, icon: item.category.icon, items: [] });
        }
        groups.get(item.category.id)!.items.push(item);
      }
    }
    // Items without category
    const noCategory = items.filter((i) => !i.category);
    if (noCategory.length > 0) {
      groups.set("none", { label: "Sem categoria", icon: "📦", items: noCategory });
    }
    // Sort by category sort_order from the categories list
    const ordered: { key: string; label: string; icon: string; items: ShoppingItem[] }[] = [];
    for (const cat of categories) {
      const g = groups.get(cat.id);
      if (g) ordered.push({ key: cat.id, ...g });
    }
    const noCat = groups.get("none");
    if (noCat) ordered.push({ key: "none", ...noCat });
    return ordered;
  }

  const pendingGroups = groupByCategory(filteredPending);
  const isEmpty = filteredPending.length === 0 && filteredPurchased.length === 0;
  const totalCount = pending.length + purchased.length;
  const purchasedCount = purchased.length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      {totalCount > 0 ? (
        <div
          style={{
            borderRadius: 16, border: "1px solid var(--border)",
            background: "var(--card)", padding: "14px 16px",
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {purchasedCount} de {totalCount} itens
            </span>
            <Link
              href="/compras/modo"
              style={{
                height: 28, borderRadius: 8, padding: "0 12px", fontSize: 12, fontWeight: 500,
                background: "var(--nav-active)", color: "var(--nav-active-ink)", display: "flex", alignItems: "center",
              }}
            >
              🛒 Modo compra
            </Link>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, borderRadius: 3, background: "var(--secondary)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%", borderRadius: 3,
                background: "var(--nav-active)",
                width: totalCount > 0 ? `${Math.round((purchasedCount / totalCount) * 100)}%` : "0%",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Mission filter chips */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilterMission(null)} style={chipStyle(filterMission === null)}>
          Todos
        </button>
        {MISSIONS.map((m) => (
          missionCounts[m] > 0 ? (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMission(filterMission === m ? null : m)}
              style={chipStyle(filterMission === m)}
            >
              {MISSION_LABELS[m]}
              <span style={{ marginLeft: 5, opacity: 0.7, fontSize: 11 }}>{missionCounts[m]}</span>
            </button>
          ) : null
        ))}
      </div>

      {/* Search */}
      {totalCount > 5 ? (
        <div className="relative">
          <Input
            type="search"
            placeholder="Buscar produto…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar produto"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Limpar busca"
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Category filter chips */}
      {activeCategories.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilterCategoryId(null)} style={chipStyle(filterCategoryId === null)}>
            Todas
          </button>
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? null : cat.id)}
              style={chipStyle(filterCategoryId === cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCategoriesOpen(true)}
            style={{ height: 32, borderRadius: 10, padding: "0 10px", fontSize: 12, background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            ⚙
          </button>
        </div>
      ) : null}

      {/* Pending items — grouped by category */}
      {pendingGroups.length > 0 ? (
        <section className="space-y-5">
          {pendingGroups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-center gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                  {group.icon} {group.label}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  {group.items.length} iten{group.items.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} categories={categories} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {/* Add item - inline form toggle */}
      <div>
        {showAddForm ? (
          <div
            style={{
              borderRadius: 16, border: "1px solid var(--border)",
              background: "var(--card)", padding: "16px",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span style={{ fontSize: 14, fontWeight: 600 }}>Novo produto</span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ fontSize: 18, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
                aria-label="Fechar formulário"
              >
                ×
              </button>
            </div>
            <AddItemForm
              categories={categories}
              rooms={rooms}
              personalSuggestions={personalSuggestions}
              onSuccess={() => setShowAddForm(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            style={{
              width: "100%", height: 48, borderRadius: 14,
              border: "1.5px dashed var(--border)",
              background: "transparent", color: "var(--muted-foreground)",
              fontSize: 14, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            Adicionar produto
          </button>
        )}
      </div>

      {/* Purchased items */}
      {filteredPurchased.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)" }}>
              Comprados ({filteredPurchased.length})
            </h2>
            <ConfirmDialog
              trigger={
                <button type="button" className="text-xs text-muted-foreground hover:text-destructive">
                  Limpar todos
                </button>
              }
              title="Limpar itens comprados"
              description="Remove todos os itens marcados como comprados. Esta ação não pode ser desfeita."
              confirmLabel="Limpar"
              destructive
              onConfirm={async () => {
                const result = await clearPurchased(initialFormState, new FormData());
                if (result.status === "error") throw new Error(result.message ?? "Erro ao limpar.");
              }}
            />
          </div>
          <div className="space-y-2">
            {filteredPurchased.map((item) => (
              <ShoppingItemRow key={item.id} item={item} categories={categories} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Empty state */}
      {isEmpty && !showAddForm ? (
        <EmptyState
          title="Lista vazia"
          description="Adicione itens para começar."
        />
      ) : null}

      {/* Category Management Dialog */}
      <ManageCategoriesDialog
        categories={categories}
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
      />
    </div>
  );
}
