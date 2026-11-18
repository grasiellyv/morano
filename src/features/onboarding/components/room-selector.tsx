"use client";

import { useState, useId } from "react";
import { cn } from "@/lib/utils";
import { ROOM_TYPES } from "@/features/onboarding/catalog";
import type { RoomType } from "@/features/onboarding/catalog";

export type PropertyType =
  | "apartamento"
  | "casa"
  | "sobrado"
  | "studio_kitnet"
  | "outro";

export type Room = { name: string; room_type: RoomType };

export const DEFAULT_ROOMS: Record<PropertyType, Room[]> = {
  apartamento: [
    { name: "Sala", room_type: "sala" },
    { name: "Cozinha", room_type: "cozinha" },
    { name: "Quarto", room_type: "quarto" },
    { name: "Banheiro", room_type: "banheiro" },
  ],
  casa: [
    { name: "Sala", room_type: "sala" },
    { name: "Cozinha", room_type: "cozinha" },
    { name: "Quarto", room_type: "quarto" },
    { name: "Banheiro", room_type: "banheiro" },
    { name: "Lavanderia", room_type: "lavanderia" },
  ],
  sobrado: [
    { name: "Sala", room_type: "sala" },
    { name: "Cozinha", room_type: "cozinha" },
    { name: "Quarto", room_type: "quarto" },
    { name: "Banheiro", room_type: "banheiro" },
    { name: "Lavanderia", room_type: "lavanderia" },
    { name: "Garagem", room_type: "garagem" },
  ],
  studio_kitnet: [
    { name: "Sala/Quarto", room_type: "sala" },
    { name: "Cozinha", room_type: "cozinha" },
    { name: "Banheiro", room_type: "banheiro" },
  ],
  outro: [
    { name: "Sala", room_type: "sala" },
    { name: "Cozinha", room_type: "cozinha" },
    { name: "Banheiro", room_type: "banheiro" },
  ],
};

const ROOM_LABELS: Record<RoomType, string> = {
  sala: "Sala",
  cozinha: "Cozinha",
  quarto: "Quarto",
  banheiro: "Banheiro",
  lavanderia: "Lavanderia",
  escritorio: "Escritório",
  varanda: "Varanda",
  garagem: "Garagem",
  outro: "Outro",
};

const SELECT_CLASS =
  "border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export function RoomSelector({ defaultRooms }: { defaultRooms: Room[] }) {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<RoomType>("outro");
  const addNameId = useId();

  // Chips: cada tipo de cômodo do catálogo
  const selectedTypes = new Set<RoomType>(rooms.map((r) => r.room_type));

  function toggleChip(roomType: RoomType) {
    const label = ROOM_LABELS[roomType];
    const idx = rooms.findIndex((r) => r.room_type === roomType && r.name === label);
    if (idx >= 0) {
      setRooms((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setRooms((prev) => [...prev, { name: label, room_type: roomType }]);
    }
  }

  function addCustomRoom() {
    const name = customName.trim();
    if (!name) return;
    setRooms((prev) => [...prev, { name, room_type: customType }]);
    setCustomName("");
  }

  return (
    <div className="space-y-6">
      {/* Grade de chips por tipo */}
      <div>
        <p className="text-muted-foreground mb-3 text-sm">
          Selecione os cômodos da sua residência:
        </p>
        <div className="flex flex-wrap gap-2">
          {ROOM_TYPES.map((roomType) => {
            const selected = selectedTypes.has(roomType);
            return (
              <button
                key={roomType}
                type="button"
                onClick={() => toggleChip(roomType)}
                aria-pressed={selected}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {ROOM_LABELS[roomType]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Adicionar cômodo personalizado */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Adicionar cômodo personalizado</p>
        <div className="flex gap-2">
          <input
            id={addNameId}
            type="text"
            placeholder="Ex: Quarto das crianças"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomRoom();
              }
            }}
            className="border-input bg-background text-foreground placeholder:text-muted-foreground ring-offset-background focus-visible:ring-ring h-10 flex-1 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label="Nome do cômodo personalizado"
          />
          <select
            value={customType}
            onChange={(e) => setCustomType(e.target.value as RoomType)}
            className={SELECT_CLASS}
            aria-label="Tipo do cômodo personalizado"
          >
            {ROOM_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {ROOM_LABELS[rt]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addCustomRoom}
            className="border-border bg-background text-foreground hover:bg-muted rounded-md border px-3 py-2 text-sm font-medium"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Lista dos cômodos selecionados */}
      {rooms.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Cômodos selecionados ({rooms.length}):
          </p>
          <ul className="space-y-1">
            {rooms.map((room, i) => (
              <li
                key={i}
                className="bg-muted flex items-center justify-between rounded-md px-3 py-1.5 text-sm"
              >
                <span>
                  {room.name}
                  {room.name !== ROOM_LABELS[room.room_type] && (
                    <span className="text-muted-foreground ml-1">
                      ({ROOM_LABELS[room.room_type]})
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setRooms((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Remover ${room.name}`}
                  className="text-muted-foreground hover:text-destructive ml-2 text-base leading-none"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Valor serializado enviado com o formulário */}
      <textarea
        name="rooms"
        hidden
        readOnly
        value={JSON.stringify(rooms)}
        onChange={() => {
          /* controlado — não editar diretamente */
        }}
      />
    </div>
  );
}
