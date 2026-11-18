import { z } from "zod";
import { ROOM_TYPES } from "@/features/onboarding/catalog";
import { residenciaSchema } from "@/features/onboarding/schemas";

// timezone não é editável após criação
export const updateHomeSchema = residenciaSchema.omit({ timezone: true });

export const addRoomSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(60, "Máximo 60 caracteres"),
  room_type: z.enum(ROOM_TYPES),
});

export const updateRoomSchema = z.object({
  id: z.string().uuid("ID inválido"),
  name: z.string().min(1, "Nome obrigatório").max(60, "Máximo 60 caracteres"),
  room_type: z.enum(ROOM_TYPES),
});

export const deleteRoomSchema = z.object({
  id: z.string().uuid("ID inválido"),
});
