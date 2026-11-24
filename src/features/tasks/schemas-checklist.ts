import { z } from "zod";

export const addChecklistItemSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().trim().min(1, { error: "Escreva o item" }).max(120, { error: "Máximo 120 caracteres" }),
});

export const removeChecklistItemSchema = z.object({
  item_id: z.string().uuid(),
});

/** "clear" volta o item para em aberto (remove o estado desta ocorrência). */
export const setChecklistStateSchema = z.object({
  occurrence_id: z.string().uuid(),
  item_id: z.string().uuid(),
  status: z.enum(["done", "skipped", "clear"]),
});
