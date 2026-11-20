import { describe, it, expect } from "vitest";
import { createListSchema, addListItemSchema } from "./schemas-lists";

describe("createListSchema", () => {
  it("rejects empty name", () => expect(createListSchema.safeParse({ name: "" }).success).toBe(false));
  it("rejects name > 100 chars", () => expect(createListSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false));
  it("accepts valid name", () => expect(createListSchema.safeParse({ name: "Churrasco" }).success).toBe(true));
});

describe("addListItemSchema", () => {
  const id = "00000000-0000-1000-8000-000000000001";
  it("requires list_id uuid", () => expect(addListItemSchema.safeParse({ list_id: "bad", name: "X" }).success).toBe(false));
  it("requires name", () => expect(addListItemSchema.safeParse({ list_id: id, name: "" }).success).toBe(false));
  it("coerces reorder_months from string", () => {
    const r = addListItemSchema.safeParse({ list_id: id, name: "Ração", reorder_months: "4" });
    expect(r.success && r.data.reorder_months).toBe(4);
  });
  it("rejects reorder_months 0", () => expect(addListItemSchema.safeParse({ list_id: id, name: "X", reorder_months: "0" }).success).toBe(false));
  it("rejects reorder_months 25", () => expect(addListItemSchema.safeParse({ list_id: id, name: "X", reorder_months: "25" }).success).toBe(false));
  it("accepts absent reorder_months", () => expect(addListItemSchema.safeParse({ list_id: id, name: "X" }).success).toBe(true));
});
