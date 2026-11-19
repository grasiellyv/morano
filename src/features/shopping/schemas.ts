import { z } from "zod";

export const addItemSchema = z.object({
  name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(120),
  category: z.enum(["limpeza", "higiene", "cozinha", "lavanderia", "alimentacao", "outros"]).default("outros"),
  quantity: z.coerce.number({ error: "Quantidade inválida" }).positive({ error: "Quantidade deve ser positiva" }).default(1),
  unit: z.enum(["un", "kg", "g", "l", "ml", "pacote", "caixa"]).default("un"),
});

export const editItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(120),
  category: z.enum(["limpeza", "higiene", "cozinha", "lavanderia", "alimentacao", "outros"]),
  quantity: z.coerce.number({ error: "Quantidade inválida" }).positive({ error: "Quantidade deve ser positiva" }),
  unit: z.enum(["un", "kg", "g", "l", "ml", "pacote", "caixa"]),
});

export const togglePurchasedSchema = z.object({
  id: z.string().uuid(),
  is_purchased: z.preprocess(v => v === "true" || v === true, z.boolean()),
});

export const deleteItemSchema = z.object({
  id: z.string().uuid(),
});
