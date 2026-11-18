import { describe, expect, it } from "vitest";
import { comodoSchema, residenciaSchema, rotinaSchema } from "./schemas";

describe("residenciaSchema", () => {
  it("rejects empty name", () => {
    expect(
      residenciaSchema.safeParse({
        name: "",
        property_type: "casa",
        ownership_type: "proprio",
        household_type: "sozinho",
        resident_count: 1,
        timezone: "America/Sao_Paulo",
      }).success,
    ).toBe(false);
  });

  it("accepts valid residencia", () => {
    expect(
      residenciaSchema.safeParse({
        name: "Minha Casa",
        property_type: "apartamento",
        ownership_type: "alugado",
        household_type: "casal",
        resident_count: 2,
        timezone: "America/Sao_Paulo",
      }).success,
    ).toBe(true);
  });
});

describe("comodoSchema", () => {
  it("rejects empty rooms array", () => {
    expect(comodoSchema.safeParse({ rooms: [] }).success).toBe(false);
  });

  it("accepts valid rooms", () => {
    expect(
      comodoSchema.safeParse({
        rooms: [{ name: "Sala de Estar", room_type: "sala" }],
      }).success,
    ).toBe(true);
  });
});

describe("rotinaSchema", () => {
  it("validates routine_level enum", () => {
    expect(
      rotinaSchema.safeParse({
        routine_level: "invalido",
        available_minutes_per_week: 60,
      }).success,
    ).toBe(false);
  });

  it("accepts valid routine", () => {
    expect(
      rotinaSchema.safeParse({
        routine_level: "equilibrada",
        available_minutes_per_week: 120,
      }).success,
    ).toBe(true);
  });
});
