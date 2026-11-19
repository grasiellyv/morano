import { describe, it, expect } from "vitest";
import { setAbsenceSchema } from "@/features/absence/schemas";

describe("setAbsenceSchema", () => {
  it("aceita datas válidas na ordem correta", () => {
    expect(
      setAbsenceSchema.safeParse({ absence_start: "2026-11-20", absence_end: "2026-11-25" }).success
    ).toBe(true);
  });

  it("aceita ausência de um único dia (start === end)", () => {
    expect(
      setAbsenceSchema.safeParse({ absence_start: "2026-11-20", absence_end: "2026-11-20" }).success
    ).toBe(true);
  });

  it("rejeita quando absence_end < absence_start", () => {
    const r = setAbsenceSchema.safeParse({ absence_start: "2026-11-25", absence_end: "2026-11-20" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toContain("absence_end");
  });

  it("rejeita formato de data inválido em absence_start", () => {
    expect(
      setAbsenceSchema.safeParse({ absence_start: "não-é-data", absence_end: "2026-11-25" }).success
    ).toBe(false);
  });
});
