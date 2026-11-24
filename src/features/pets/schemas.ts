import { z } from "zod";

export const SPECIES = ["cachorro", "gato", "passaro", "peixe", "roedor", "outro"] as const;
export type Species = (typeof SPECIES)[number];

export const SPECIES_LABELS: Record<Species, string> = {
  cachorro: "Cachorro",
  gato: "Gato",
  passaro: "Pássaro",
  peixe: "Peixe",
  roedor: "Roedor",
  outro: "Outro",
};

export const addPetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Dê um nome ao animal" })
    .max(60, { error: "Nome deve ter no máximo 60 caracteres" }),
  species: z.enum(SPECIES, { error: "Escolha a espécie" }),
  notes: z.string().trim().max(500, { error: "Máximo de 500 caracteres" }).optional(),
});

export const deletePetSchema = z.object({ id: z.string().uuid() });
