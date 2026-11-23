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

  function chipStyle(active: boolean): React.CSSProperties {
    return active
      ? { height: 32, borderRadius: 10, background: "var(--nav-active)", color: "var(--nav-active-ink)", border: "none", padding: "0 14px", fontSize: 13, fontWeight: 500 }
      : { height: 32, borderRadius: 10, background: "var(--secondary)", color: "var(--muted-foreground)", border: "none", padding: "0 14px", fontSize: 13, fontWeight: 500 };
  }

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
          <button type="button" onClick={() => setFilterRoomId(null)} style={chipStyle(filterRoomId === null)}>Todos</button>
          {roomsWithItems.map((room) => (
            <button key={room.id} type="button" onClick={() => setFilterRoomId(filterRoomId === room.id ? null : room.id)} style={chipStyle(filterRoomId === room.id)}>
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
