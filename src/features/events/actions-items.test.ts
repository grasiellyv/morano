import { describe, expect, it } from "vitest";
import { removeEventItemSchema } from "./schemas";

describe("removeEventItemSchema", () => {
  it("aceita um UUID", () => {
    expect(removeEventItemSchema.safeParse({ id: "11111111-1111-4111-8111-111111111111" }).success).toBe(true);
  });
  it("rejeita id que não é UUID ou ausente", () => {
    expect(removeEventItemSchema.safeParse({ id: "x" }).success).toBe(false);
    expect(removeEventItemSchema.safeParse({}).success).toBe(false);
  });
});
