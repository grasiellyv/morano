"use client";

import { useState, useDeferredValue } from "react";
import type { ShoppingItem } from "@/features/shopping/queries";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import type { ShoppingList } from "@/features/shopping/queries-lists";
import { ShoppingItemRow } from "@/features/shopping/components/shopping-item-row";
import { AddItemForm } from "@/features/shopping/components/add-item-form";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/empty-state";
import { NamedListsSection } from "@/features/shopping/components/named-lists-section";
import { ManageCategoriesDialog } from "@/features/shopping/components/manage-categories-dialog";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { clearPurchased } from "@/features/shopping/actions";
import { initialFormState } from "@/features/auth/form-state";

type Props = {
  pending: ShoppingItem[];
  purchased: ShoppingItem[];
  categories: ShoppingCategory[];
  rooms: { id: string; name: string }[];
  lists: ShoppingList[];
};

export function ShoppingList({ pending, purchased, categories, rooms, lists }: Props) {
  const [filterRoomId, setFilterRoomId] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const personalSuggestions = Array.from(
    new Map(
      lists.flatMap((l) => l.items).map((item) => [item.name.toLowerCase(), { name: item.name, category_id: item.category_id }])
    ).values()
  );

  function matchesSearch(item: ShoppingItem) {
    if (!deferredQuery) return true;
    return item.name.toLowerCase().includes(deferredQuery.toLowerCase());
  }

  const filteredPending = pending
    .filter((item) => !filterRoomId || item.room_id === filterRoomId)
    .filter((item) => !filterCategoryId || item.category_id === filterCategoryId)
    .filter(matchesSearch);
  const filteredPurchased = purchased
    .filter((item) => !filterRoomId || item.room_id === filterRoomId)
    .filter((item) => !filterCategoryId || item.category_id === filterCategoryId)
    .filter(matchesSearch);

  const activeCategories = categories.filter((cat) =>
    [...pending, ...purchased].some((item) => item.category_id === cat.id),
  );

  const isEmpty = filteredPending.length === 0 && filteredPurchased.length === 0;

  function chipStyle(active: boolean): React.CSSProperties {
    return active
      ? { height: 32, borderRadius: 10, background: "var(--nav-active)", color: "var(--nav-active-ink)", border: "none", padding: "0 14px", fontSize: 13, fontWeight: 500 }
      : { height: 32, borderRadius: 10, background: "var(--secondary)", color: "var(--muted-foreground)", border: "none", padding: "0 14px", fontSize: 13, fontWeight: 500 };
  }

  return (
    <div className="space-y-8">
      {/* Room filter chips */}
      {rooms.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilterRoomId(null)} style={chipStyle(filterRoomId === null)}>Todos</button>
          {rooms.map((room) => (
            <button key={room.id} type="button" onClick={() => setFilterRoomId(room.id)} style={chipStyle(filterRoomId === room.id)}>
              {room.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Search */}
      {(pending.length + purchased.length) > 5 ? (
        <div className="relative">
          <Input
            type="search"
            placeholder="Buscar item…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar item na lista"
            className="pl-3"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          <button type="button" onClick={() => setFilterCategoryId(null)} style={chipStyle(filterCategoryId === null)}>Todas</button>
          {activeCategories.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? null : cat.id)} style={chipStyle(filterCategoryId === cat.id)}>
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Pendentes */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-semibold">
            Pendentes
            {filteredPending.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredPending.length})
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={() => setCategoriesOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ⚙ Categorias
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <AddItemForm categories={categories} rooms={rooms} personalSuggestions={personalSuggestions} />
        </div>

        {filteredPending.length > 0 ? (
          <div className="space-y-2">
            {filteredPending.map((item) => (
              <ShoppingItemRow key={item.id} item={item} categories={categories} />
            ))}
          </div>
        ) : null}
      </section>

      {/* Comprados */}
      {filteredPurchased.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-base font-semibold">
              Comprados
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredPurchased.length})
              </span>
            </h2>
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Limpar todos
                </button>
              }
              title="Limpar itens comprados"
              description="Remove todos os itens marcados como comprados da lista. Esta ação não pode ser desfeita."
              confirmLabel="Limpar"
              destructive
              onConfirm={async () => {
                const result = await clearPurchased(initialFormState, new FormData());
                if (result.status === "error") {
                  throw new Error(result.message ?? "Erro ao limpar comprados.");
                }
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

      {/* Empty state when both lists are empty */}
      {isEmpty ? (
        <EmptyState
          title="Sua lista de compras está vazia"
          description="Adicione itens acima para começar sua lista."
        />
      ) : null}

      {/* Named Lists */}
      <NamedListsSection lists={lists} categories={categories} />

      {/* Category Management Dialog */}
      <ManageCategoriesDialog
        categories={categories}
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
      />
    </div>
  );
}
