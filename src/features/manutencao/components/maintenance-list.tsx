import type { MaintenanceItem } from "@/features/manutencao/queries";
import { AddMaintenanceForm } from "@/features/manutencao/components/add-maintenance-form";
import { MaintenanceItemCard } from "@/features/manutencao/components/maintenance-item-card";
import { EmptyState } from "@/components/feedback/empty-state";

type Props = {
  items: MaintenanceItem[];
  rooms: Array<{ id: string; name: string }>;
};

export function MaintenanceList({ items, rooms }: Props) {
  const open = items.filter(
    (i) => i.status === "pendente" || i.status === "em_andamento",
  );
  const history = items.filter(
    (i) => i.status === "concluido" || i.status === "cancelado",
  );

  return (
    <div className="space-y-8">
      {/* Add form */}
      <section>
        <div className="rounded-xl border border-border bg-card p-4">
          <AddMaintenanceForm rooms={rooms} />
        </div>
      </section>

      {/* Open items */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Em aberto
          {open.length > 0 ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({open.length})
            </span>
          ) : null}
        </h2>

        {open.length === 0 ? (
          <EmptyState
            title="Nenhum item em aberto"
            description="Adicione um problema ou serviço acima."
          />
        ) : (
          <div className="space-y-2">
            {open.map((item) => (
              <MaintenanceItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* History — always rendered; open by default if non-empty */}
      <section>
        <details open={history.length > 0}>
          <summary className="mb-3 cursor-pointer select-none text-base font-semibold">
            Histórico
            {history.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({history.length})
              </span>
            ) : null}
          </summary>

          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item no histórico ainda.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <MaintenanceItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </details>
      </section>
    </div>
  );
}
