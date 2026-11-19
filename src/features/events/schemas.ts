import { z } from "zod";

const eventBaseSchema = z.object({
  title: z.string().trim().min(1, { error: "Título obrigatório" }).max(200),
  event_type: z.enum(["aniversario", "viagem", "jantar", "consulta_medica", "visita", "manutencao", "feriado", "outros"]).default("outros"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida" }),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform(v => v || null),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().or(z.literal("")).transform(v => v || null),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().or(z.literal("")).transform(v => v || null),
  description: z.string().max(500).optional().or(z.literal("")).transform(v => v || null),
});

const dateOrder = (data: { start_date: string; end_date: string | null }) =>
  !data.end_date || data.end_date >= data.start_date;
const dateOrderMsg = {
  message: "Data de término deve ser igual ou posterior à data de início",
  path: ["end_date"],
};

export const createEventSchema = eventBaseSchema.refine(dateOrder, dateOrderMsg);
export const updateEventSchema = eventBaseSchema.extend({ id: z.string().uuid() }).refine(dateOrder, dateOrderMsg);

export const deleteEventSchema = z.object({ id: z.string().uuid() });
