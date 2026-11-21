import { describe, it, expect } from "vitest";
import { buildRotationInfoMap } from "./queries-rotations";
import type { TaskRotation } from "./queries-rotations";

const makeRotation = (overrides: Partial<TaskRotation> = {}): TaskRotation => ({
  id: "r1", home_id: "h1", name: "Lavar", rotation_day: 1,
  current_member_index: 0, last_rotated_at: null, created_at: "2026-01-01T00:00:00Z",
  members: [
    { profile_id: "u1", sort_order: 0, name: "Ana", avatar_url: null },
    { profile_id: "u2", sort_order: 1, name: "Ben", avatar_url: null },
  ],
  ...overrides,
});

describe("buildRotationInfoMap", () => {
  it("resolves current and next member", () => {
    const map = buildRotationInfoMap([makeRotation()], new Set());
    expect(map["r1"]!.currentMemberId).toBe("u1");
    expect(map["r1"]!.currentMemberName).toBe("Ana");
    expect(map["r1"]!.nextMemberName).toBe("Ben");
  });
  it("skips absent current member", () => {
    const map = buildRotationInfoMap([makeRotation()], new Set(["u1"]));
    expect(map["r1"]!.currentMemberId).toBe("u2");
  });
  it("returns null when all absent", () => {
    const map = buildRotationInfoMap([makeRotation()], new Set(["u1", "u2"]));
    expect(map["r1"]!.currentMemberId).toBeNull();
  });
  it("last_rotated_at null does not throw", () => {
    expect(() => buildRotationInfoMap([makeRotation({ last_rotated_at: null })], new Set())).not.toThrow();
  });
});
