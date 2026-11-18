import type { RoomType } from "@/features/onboarding/catalog";

export type PropertyType =
  | "apartamento"
  | "casa"
  | "sobrado"
  | "studio_kitnet"
  | "outro";

export type Room = { name: string; room_type: RoomType };

/**
 * Cômodos pré-selecionados por tipo de imóvel.
 * Importado tanto pelo Server Component (comodos/page.tsx)
 * quanto pelo Client Component (room-selector.tsx) — sem "use client".
 */
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
