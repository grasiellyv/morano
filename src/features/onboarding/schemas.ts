import { z } from "zod";
import { ROOM_TYPES, ROUTINE_LEVELS } from "./catalog";

export const residenciaSchema = z.object({
  name: z.string().min(1).max(100),
  property_type: z.enum([
    "apartamento",
    "casa",
    "sobrado",
    "studio_kitnet",
    "outro",
  ]),
  ownership_type: z.enum(["proprio", "alugado", "outro"]),
  household_type: z.enum([
    "sozinho",
    "casal",
    "familia",
    "compartilhada",
    "outro",
  ]),
  resident_count: z.coerce
    .number({ error: "Informe o número de moradores" })
    .int("Deve ser um número inteiro")
    .min(1, "Mínimo 1 morador")
    .max(20, "Máximo 20 moradores"),
  timezone: z.string().min(1),
});

export const comodoSchema = z.object({
  rooms: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        room_type: z.enum(ROOM_TYPES),
      }),
    )
    .min(1, "Adicione ao menos um cômodo"),
});

export const rotinaSchema = z.object({
  routine_level: z.enum(ROUTINE_LEVELS),
});

export const revisaoTaskSchema = z.object({
  id: z.string(),
  include: z.boolean(),
  title: z.string().min(1).max(200),
  frequency_type: z.enum(["once", "daily", "weekly", "biweekly", "monthly"]),
});
