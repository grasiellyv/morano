import { describe, it, expect } from "vitest";
import { createCategorySchema, updateCategorySchema, deleteCategorySchema } from "./schemas-categories";

describe("createCategorySchema", () => {
  it("rejects empty name", () => expect(createCategorySchema.safeParse({ name: "" }).success).toBe(false));
  it("rejects name > 50 chars", () => expect(createCategorySchema.safeParse({ name: "a".repeat(51) }).success).toBe(false));
  it("accepts valid name", () => expect(createCategorySchema.safeParse({ name: "Hortifruti" }).success).toBe(true));
  it("icon defaults to 🛒 when omitted", () => {
    const r = createCategorySchema.safeParse({ name: "Teste" });
    expect(r.success && r.data.icon).toBe("🛒");
  });
});
describe("updateCategorySchema", () => {
  it("requires uuid id", () => expect(updateCategorySchema.safeParse({ id: "not-uuid", name: "X" }).success).toBe(false));
  it("accepts valid update", () => expect(updateCategorySchema.safeParse({ id: "00000000-0000-1000-8000-000000000001", name: "Novo Nome", icon: "🌿" }).success).toBe(true));
});
describe("deleteCategorySchema", () => {
  it("requires uuid id", () => expect(deleteCategorySchema.safeParse({ id: "bad" }).success).toBe(false));
  it("accepts uuid", () => expect(deleteCategorySchema.safeParse({ id: "00000000-0000-1000-8000-000000000001" }).success).toBe(true));
});
