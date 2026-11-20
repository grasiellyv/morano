import { describe, expect, it } from "vitest";
import { createMaintenanceSchema, updateStatusSchema } from "./schemas";

describe("createMaintenanceSchema", () => {
  it("rejects empty title", () => {
    expect(createMaintenanceSchema.safeParse({ title: "" }).success).toBe(false);
  });
  it("accepts title only", () => {
    expect(createMaintenanceSchema.safeParse({ title: "Vazamento" }).success).toBe(true);
  });
  it("rejects title with 201 chars", () => {
    expect(createMaintenanceSchema.safeParse({ title: "a".repeat(201) }).success).toBe(false);
  });
  it("accepts all optional fields", () => {
    expect(
      createMaintenanceSchema.safeParse({
        title: "Pintura",
        description: "Quarto principal",
        room_id: "00000000-0000-1000-8000-000000000001",
        notes: "Orçamento pendente",
      }).success
    ).toBe(true);
  });
});

describe("updateStatusSchema", () => {
  it("rejects status pendente", () => {
    expect(
      updateStatusSchema.safeParse({
        id: "00000000-0000-1000-8000-000000000001",
        status: "pendente",
      }).success
    ).toBe(false);
  });
  it("accepts concluido", () => {
    expect(
      updateStatusSchema.safeParse({
        id: "00000000-0000-1000-8000-000000000001",
        status: "concluido",
      }).success
    ).toBe(true);
  });
});
