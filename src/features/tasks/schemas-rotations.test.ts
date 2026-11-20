import { describe, it, expect } from "vitest";
import { createRotationSchema, addRotationMemberSchema, resolveCurrentMember } from "./schemas-rotations";

describe("createRotationSchema", () => {
  it("accepts valid rotation", () => {
    const r = createRotationSchema.safeParse({ name: "Lavar louça", rotation_day: "1" });
    expect(r.success).toBe(true);
    expect(r.data?.rotation_day).toBe(1);
  });
  it("rejects empty name", () => {
    const r = createRotationSchema.safeParse({ name: "", rotation_day: "1" });
    expect(r.success).toBe(false);
  });
  it("rejects name > 100 chars", () => {
    const r = createRotationSchema.safeParse({ name: "a".repeat(101), rotation_day: "1" });
    expect(r.success).toBe(false);
  });
  it("rejects rotation_day out of range", () => {
    expect(createRotationSchema.safeParse({ name: "X", rotation_day: "7" }).success).toBe(false);
    expect(createRotationSchema.safeParse({ name: "X", rotation_day: "-1" }).success).toBe(false);
  });
});

describe("resolveCurrentMember", () => {
  const members = [
    { profile_id: "a", sort_order: 0 },
    { profile_id: "b", sort_order: 1 },
    { profile_id: "c", sort_order: 2 },
  ];

  it("returns member at currentIndex when not absent", () => {
    expect(resolveCurrentMember(members, 0, new Set())).toBe("a");
    expect(resolveCurrentMember(members, 1, new Set())).toBe("b");
  });
  it("skips absent member and returns next", () => {
    expect(resolveCurrentMember(members, 0, new Set(["a"]))).toBe("b");
  });
  it("wraps around when skipping past end", () => {
    expect(resolveCurrentMember(members, 2, new Set(["c"]))).toBe("a");
  });
  it("returns null when all absent", () => {
    expect(resolveCurrentMember(members, 0, new Set(["a", "b", "c"]))).toBeNull();
  });
  it("returns null when members is empty", () => {
    expect(resolveCurrentMember([], 0, new Set())).toBeNull();
  });
  it("handles currentIndex >= members.length (wrap-around)", () => {
    expect(resolveCurrentMember(members, 5, new Set())).toBe("c"); // 5 % 3 = 2 -> "c"
  });
});
