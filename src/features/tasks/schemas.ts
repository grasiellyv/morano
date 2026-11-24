import { z } from "zod";

// Horário opcional ("HH:mm" do <input type="time"> ou "HH:mm:ss" do Postgres).
// String vazia = sem horário.
const dueTimeField = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { error: "Horário inválido" })
    .nullable()
    .optional(),
);

export const createTaskSchema = z.object({
  title: z.string().min(1, { error: "Título obrigatório" }).max(120),
  description: z.string().max(500).optional(),
  instructions: z.string().max(2000).optional(),
  priority: z.enum(["baixa", "media", "alta"]),
  is_essential: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
  room_id: z.string().uuid().nullable().optional(),
  due_time: dueTimeField,
  frequency_type: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "custom"]),
  interval_value: z.coerce.number().min(1).max(365).nullable().optional(),
  interval_unit: z.enum(["day", "week", "month"]).nullable().optional(),
  weekdays: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.number().min(0).max(6)).nullable().optional(),
  ),
  month_day: z.coerce.number().min(1).max(31).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida" }),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const updateTaskMetaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, { error: "Título obrigatório" }).max(120),
  description: z.string().max(500).optional(),
  instructions: z.string().max(2000).optional(),
  priority: z.enum(["baixa", "media", "alta"]),
  is_essential: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
  room_id: z.string().uuid().nullable().optional(),
  due_time: dueTimeField,
});

export const editTaskRuleSchema = z.object({
  id: z.string().uuid(),
  frequency_type: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "custom"]),
  interval_value: z.coerce.number().min(1).max(365).nullable().optional(),
  interval_unit: z.enum(["day", "week", "month"]).nullable().optional(),
  weekdays: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.number().min(0).max(6)).nullable().optional(),
  ),
  month_day: z.coerce.number().min(1).max(31).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
