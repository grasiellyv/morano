import type { ShoppingItem } from "@/features/shopping/queries";
import { ShoppingItemRow } from "@/features/shopping/components/shopping-item-row";
import { AddItemForm } from "@/features/shopping/components/add-item-form";
import { EmptyState } from "@/components/feedback/empty-state";

type Props = {
  pending: ShoppingItem[];
  purchased: ShoppingItem[];
};

export function ShoppingList({ pending, purchased }: Props) {
  const isEmpty = pending.length === 0 && purchased.length === 0;

  return (
    <div className="space-y-8">
      {/* Pendentes */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Pendentes
          {pending.length > 0 ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({pending.length})
            </span>
          ) : null}
        </h2>

        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <AddItemForm />
        </div>

        {pending.length > 0 ? (
          <div className="space-y-2">
            {pending.map((item) => (
              <ShoppingItemRow key={item.id} item={item} />
            ))}
          </div>
        ) : null}
      </section>

      {/* Comprados */}
      {purchased.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Comprados
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({purchased.length})
            </span>
          </h2>
          <div className="space-y-2">
            {purchased.map((item) => (
              <ShoppingItemRow key={item.id} item={item} />
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
    </div>
  );
}
