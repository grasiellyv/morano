"use client";

import { useState } from "react";
import type { ShoppingItem } from "@/features/shopping/queries";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import type { ShoppingList } from "@/features/shopping/queries-lists";
import { ShoppingItemRow } from "@/features/shopping/components/shopping-item-row";
import { AddItemForm } from "@/features/shopping/components/add-item-form";
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
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const filteredPending = filterRoomId
    ? pending.filter((item) => item.room_id === filterRoomId)
    : pending;
  const filteredPurchased = filterRoomId
    ? purchased.filter((item) => item.room_id === filterRoomId)
    : purchased;

  const isEmpty = filteredPending.length === 0 && filteredPurchased.length === 0;

  const chipBase = "rounded-full border px-3 py-1 text-xs transition-colors";
  const chipActive = "border-foreground bg-foreground text-background";
  const chipInactive = "border-border bg-card text-muted-foreground hover:bg-muted";

  return (
    <div className="space-y-8">
      {/* Room filter chips */}
      {rooms.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterRoomId(null)}
            className={`${chipBase} ${filterRoomId === null ? chipActive : chipInactive}`}
          >
            Todos
          </button>
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setFilterRoomId(room.id)}
              className={`${chipBase} ${filterRoomId === room.id ? chipActive : chipInactive}`}
            >
              {room.name}
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
          <AddItemForm categories={categories} rooms={rooms} />
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
