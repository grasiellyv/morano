import { z } from "zod";

export const createMaintenanceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Título obrigatório" })
    .max(200, { error: "Título deve ter no máximo 200 caracteres" }),
  description: z.string().trim().optional(),
  room_id: z.string().uuid().optional(),
  notes: z.string().trim().optional(),
});

export const updateMaintenanceSchema = createMaintenanceSchema.extend({
  id: z.string().uuid(),
});

export const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["em_andamento", "concluido", "cancelado"], { error: "Status inválido" }),
});

export const deleteMaintenanceSchema = z.object({
  id: z.string().uuid(),
});
