import { z } from "zod";
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(50),
  icon: z.string().default("🛒"),
});
export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(50),
  icon: z.string().default("🛒"),
});
export const deleteCategorySchema = z.object({ id: z.string().uuid() });
