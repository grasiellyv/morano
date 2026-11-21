import { z } from "zod";

export const createListSchema = z.object({
  name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(100),
});

export const updateListSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(100),
});

export const deleteListSchema = z.object({ id: z.string().uuid() });

const listItemBase = z.object({
  name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(120),
  category_id: z.string().uuid().optional(),
  quantity: z.coerce.number({ error: "Quantidade inválida" }).positive({ error: "Quantidade deve ser positiva" }).max(9999, { error: "Máximo 9999" }).multipleOf(0.01, { error: "Máximo 2 casas decimais" }).default(1),
  unit: z.enum(["un", "kg", "g", "l", "ml", "pacote", "caixa"]).default("un"),
  notes: z.string().trim().max(200).optional(),
  reorder_months: z.coerce.number().int().min(1, { error: "Mínimo 1 mês" }).max(24, { error: "Máximo 24 meses" }).optional(),
});

export const addListItemSchema = listItemBase.extend({ list_id: z.string().uuid() });
export const updateListItemSchema = listItemBase.extend({ id: z.string().uuid() });
export const deleteListItemSchema = z.object({ id: z.string().uuid() });
export const applyListSchema = z.object({ list_id: z.string().uuid() });
