import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().trim().min(1, { error: "Título obrigatório" }).max(200),
  event_type: z.enum(["aniversario", "viagem", "jantar", "consulta_medica", "visita", "manutencao", "feriado", "outros"]).default("outros"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida" }),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform(v => v || null),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")).transform(v => v || null),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")).transform(v => v || null),
  description: z.string().max(500).optional().or(z.literal("")).transform(v => v || null),
});

export const updateEventSchema = createEventSchema.extend({ id: z.string().uuid() });

export const deleteEventSchema = z.object({ id: z.string().uuid() });
