import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const setAbsenceSchema = z
  .object({
    absence_start: z.string().trim().regex(dateRegex, { error: "Data de início inválida" }),
    absence_end: z.string().trim().regex(dateRegex, { error: "Data de término inválida" }),
  })
  .refine((d) => d.absence_end >= d.absence_start, {
    error: "Data de término deve ser igual ou posterior à data de início",
    path: ["absence_end"],
  });
