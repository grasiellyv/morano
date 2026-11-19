import { describe, it, expect } from "vitest";
import { createEventSchema, updateEventSchema, deleteEventSchema } from "./schemas";

describe("createEventSchema", () => {
  it("aceita evento válido com campos obrigatórios", () => {
    const result = createEventSchema.safeParse({
      title: "Aniversário João",
      event_type: "aniversario",
      start_date: "2026-11-25",
    });
    expect(result.success).toBe(true);
  });

  it("faz trim no título", () => {
    const result = createEventSchema.safeParse({
      title: "  Viagem SP  ",
      event_type: "viagem",
      start_date: "2026-11-25",
      end_date: "2026-11-27",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Viagem SP");
    }
  });

  it("rejeita título vazio (só espaços)", () => {
    const result = createEventSchema.safeParse({
      title: "   ",
      event_type: "aniversario",
      start_date: "2026-11-25",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["title"]).toBeDefined();
    }
  });

  it("rejeita event_type inválido", () => {
    const result = createEventSchema.safeParse({
      title: "Teste",
      event_type: "tipo_invalido",
      start_date: "2026-11-25",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["event_type"]).toBeDefined();
    }
  });

  it("aceita end_date anterior a start_date (validação é do DB)", () => {
    const result = createEventSchema.safeParse({
      title: "Teste",
      event_type: "viagem",
      start_date: "2026-11-27",
      end_date: "2026-11-25",
    });
    expect(result.success).toBe(true);
  });

  it("transforma end_date vazio em null", () => {
    const result = createEventSchema.safeParse({
      title: "Teste",
      event_type: "outros",
      start_date: "2026-11-25",
      end_date: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.end_date).toBeNull();
    }
  });

  it("usa 'outros' como padrão para event_type", () => {
    const result = createEventSchema.safeParse({
      title: "Teste",
      start_date: "2026-11-25",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event_type).toBe("outros");
    }
  });
});

describe("updateEventSchema", () => {
  it("aceita dados válidos com id", () => {
    const result = updateEventSchema.safeParse({
      id: "00000000-0000-1000-8000-000000000001",
      title: "Evento atualizado",
      event_type: "jantar",
      start_date: "2026-11-25",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando id está ausente", () => {
    const result = updateEventSchema.safeParse({
      title: "Evento atualizado",
      event_type: "jantar",
      start_date: "2026-11-25",
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteEventSchema", () => {
  it("aceita UUID válido", () => {
    const result = deleteEventSchema.safeParse({
      id: "00000000-0000-1000-8000-000000000001",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita string não-UUID", () => {
    const result = deleteEventSchema.safeParse({ id: "nao-uuid" });
    expect(result.success).toBe(false);
  });
});
