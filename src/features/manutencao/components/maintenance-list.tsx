"use client";

import { useState } from "react";
import type { MaintenanceItem } from "@/features/manutencao/queries";
import { AddMaintenanceForm } from "@/features/manutencao/components/add-maintenance-form";
import { MaintenanceItemCard } from "@/features/manutencao/components/maintenance-item-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { CelebrationOverlay } from "@/features/tasks/components/celebration-overlay";

type Props = {
  items: MaintenanceItem[];
  rooms: Array<{ id: string; name: string }>;
};

export function MaintenanceList({ items, rooms }: Props) {
  const [celebrationItemId, setCelebrationItemId] = useState<string | null>(null);
  const [filterRoomId, setFilterRoomId] = useState<string | null>(null);

  const allOpen = items.filter(
    (i) => i.status === "pendente" || i.status === "em_andamento",
  );
  const allHistory = items.filter(
    (i) => i.status === "concluido" || i.status === "cancelado",
  );

  const open = filterRoomId ? allOpen.filter((i) => i.room_id === filterRoomId) : allOpen;
  const history = filterRoomId ? allHistory.filter((i) => i.room_id === filterRoomId) : allHistory;

  const roomsWithItems = rooms.filter((r) => items.some((i) => i.room_id === r.id));

  const chipBase = "rounded-full border px-3 py-1 text-xs transition-colors";
  const chipActive = "border-foreground bg-foreground text-background";
  const chipInactive = "border-border bg-card text-muted-foreground hover:bg-muted";

  return (
    <div className="space-y-8">
      <CelebrationOverlay
        show={celebrationItemId !== null}
        onDismiss={() => setCelebrationItemId(null)}
        title="Item concluído! 🎉"
        message="Registrado no histórico."
      />

      {/* Add form */}
      <section>
        <div className="rounded-xl border border-border bg-card p-4">
          <AddMaintenanceForm rooms={rooms} />
        </div>
      </section>

      {/* Room filter chips */}
      {roomsWithItems.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterRoomId(null)}
            className={`${chipBase} ${filterRoomId === null ? chipActive : chipInactive}`}
          >
            Todos
          </button>
          {roomsWithItems.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setFilterRoomId(filterRoomId === room.id ? null : room.id)}
              className={`${chipBase} ${filterRoomId === room.id ? chipActive : chipInactive}`}
            >
              {room.name}
            </button>
          ))}
        </div>
      ) : null}

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
              <MaintenanceItemCard key={item.id} item={item} onCompleted={(id) => setCelebrationItemId(id)} />
            ))}
          </div>
        )}
      </section>

      {/* History — closed by default */}
      <section>
        <details>
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
                <MaintenanceItemCard key={item.id} item={item} onCompleted={(id) => setCelebrationItemId(id)} />
              ))}
            </div>
          )}
        </details>
      </section>
    </div>
  );
}
