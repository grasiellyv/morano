import { z } from "zod";

export const addItemSchema = z.object({
  name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(120),
  category_id: z.string().uuid().optional(),
  quantity: z.coerce.number({ error: "Quantidade inválida" }).positive({ error: "Quantidade deve ser positiva" }).max(9999, { error: "Máximo 9999" }).multipleOf(0.01, { error: "Máximo 2 casas decimais" }).default(1),
  unit: z.enum(["un", "kg", "g", "l", "ml", "pacote", "caixa"]).default("un"),
  notes: z.string().trim().max(200, { error: "Máximo 200 caracteres" }).optional(),
  room_id: z.string().uuid().optional(),
});

export const editItemSchema = addItemSchema.extend({
  id: z.string().uuid(),
});

export const togglePurchasedSchema = z.object({
  id: z.string().uuid(),
  is_purchased: z.preprocess(v => v === "true" || v === true, z.boolean()),
});

export const deleteItemSchema = z.object({
  id: z.string().uuid(),
});
