import { describe, expect, it } from "vitest";
import { addPetSchema, deletePetSchema, SPECIES } from "./schemas";

describe("addPetSchema", () => {
  it("aceita nome e espécie, com observação opcional", () => {
    expect(addPetSchema.safeParse({ name: "Thor", species: "cachorro" }).success).toBe(true);
    expect(addPetSchema.safeParse({ name: "Mia", species: "gato", notes: "Ração às 8h" }).success).toBe(true);
  });
  it("apara espaços e rejeita nome vazio", () => {
    const ok = addPetSchema.safeParse({ name: "  Thor  ", species: "cachorro" });
    expect(ok.success && ok.data.name).toBe("Thor");
    expect(addPetSchema.safeParse({ name: "   ", species: "gato" }).success).toBe(false);
  });
  it("rejeita espécie desconhecida e observação longa", () => {
    expect(addPetSchema.safeParse({ name: "X", species: "dragao" }).success).toBe(false);
    expect(addPetSchema.safeParse({ name: "X", species: "gato", notes: "a".repeat(501) }).success).toBe(false);
  });
  it("cobre todas as espécies do banco", () => {
    expect(SPECIES).toHaveLength(6);
  });
});

describe("deletePetSchema", () => {
  it("exige uuid", () => {
    expect(deletePetSchema.safeParse({ id: "x" }).success).toBe(false);
    expect(deletePetSchema.safeParse({ id: "00000000-0000-1000-8000-000000000001" }).success).toBe(true);
  });
});
