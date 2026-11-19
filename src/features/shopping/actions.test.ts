import { describe, it, expect } from "vitest";
import { addItemSchema, editItemSchema, togglePurchasedSchema } from "./schemas";

describe("addItemSchema", () => {
  it("rejects empty name", () => {
    expect(addItemSchema.safeParse({ name: "" }).success).toBe(false);
  });
  it("rejects name with only spaces", () => {
    const r = addItemSchema.safeParse({ name: "   " });
    // trim makes it empty, min(1) rejects
    expect(r.success).toBe(false);
  });
  it("rejects name over 120 chars", () => {
    expect(addItemSchema.safeParse({ name: "a".repeat(121) }).success).toBe(false);
  });
  it("rejects quantity zero", () => {
    expect(addItemSchema.safeParse({ name: "Sabão", quantity: 0 }).success).toBe(false);
  });
  it("rejects negative quantity", () => {
    expect(addItemSchema.safeParse({ name: "Sabão", quantity: -1 }).success).toBe(false);
  });
  it("applies defaults: category outros, quantity 1, unit un", () => {
    const r = addItemSchema.safeParse({ name: "Sabão" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.category).toBe("outros");
      expect(r.data.quantity).toBe(1);
      expect(r.data.unit).toBe("un");
    }
  });
  it("rejects invalid category", () => {
    expect(addItemSchema.safeParse({ name: "Sabão", category: "eletronicos" }).success).toBe(false);
  });
  it("rejects invalid unit", () => {
    expect(addItemSchema.safeParse({ name: "Sabão", unit: "litros" }).success).toBe(false);
  });
  it("accepts valid item with all fields", () => {
    const r = addItemSchema.safeParse({ name: "Arroz", category: "alimentacao", quantity: 2, unit: "kg" });
    expect(r.success).toBe(true);
  });
  it("coerces quantity from string", () => {
    const r = addItemSchema.safeParse({ name: "Arroz", quantity: "2.5" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.quantity).toBe(2.5);
  });
});

describe("editItemSchema", () => {
  it("requires uuid id", () => {
    expect(editItemSchema.safeParse({ id: "not-a-uuid", name: "Arroz", category: "alimentacao", quantity: 1, unit: "un" }).success).toBe(false);
  });
  it("requires name", () => {
    expect(editItemSchema.safeParse({ id: "00000000-0000-1000-8000-000000000001", name: "", category: "outros", quantity: 1, unit: "un" }).success).toBe(false);
  });
});

describe("togglePurchasedSchema", () => {
  it("coerces string 'true' to boolean true", () => {
    const r = togglePurchasedSchema.safeParse({ id: "00000000-0000-1000-8000-000000000001", is_purchased: "true" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.is_purchased).toBe(true);
  });
  it("coerces string 'false' to boolean false", () => {
    const r = togglePurchasedSchema.safeParse({ id: "00000000-0000-1000-8000-000000000001", is_purchased: "false" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.is_purchased).toBe(false);
  });
});

// Testes de trigger set_purchased via banco local
// Esses testes são de lógica pura (schemas) — integração com DB não é testada aqui.
// O trigger é validado no relatório via verificação manual descrita no Step 11.

describe("togglePurchasedSchema — boundary", () => {
  it("requires id", () => {
    expect(togglePurchasedSchema.safeParse({ is_purchased: "true" }).success).toBe(false);
  });
  it("rejects invalid uuid", () => {
    expect(togglePurchasedSchema.safeParse({ id: "abc-not-a-uuid", is_purchased: "true" }).success).toBe(false);
  });
});
