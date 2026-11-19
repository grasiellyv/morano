import { describe, it, expect } from "vitest";
import { filterAbsenceOccurrences } from "@/features/absence/queries";

type TestOcc = { scheduled_for: string; status: string };
const RANGE = { start: "2026-11-20", end: "2026-11-25" };

describe("filterAbsenceOccurrences", () => {
  it("retorna array vazio sem modificação", () => {
    expect(filterAbsenceOccurrences([], RANGE)).toEqual([]);
  });

  it("retorna tudo quando range é null", () => {
    const occs: TestOcc[] = [
      { scheduled_for: "2026-11-21", status: "pending" },
      { scheduled_for: "2026-11-21", status: "missed" },
    ];
    expect(filterAbsenceOccurrences(occs, null)).toEqual(occs);
  });

  it("remove ocorrência pending dentro do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-21", status: "pending" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual([]);
  });

  it("remove ocorrência missed dentro do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-21", status: "missed" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual([]);
  });

  it("mantém ocorrência completed dentro do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-21", status: "completed" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual(occs);
  });

  it("mantém ocorrência skipped dentro do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-21", status: "skipped" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual(occs);
  });

  it("mantém ocorrência pending fora do período", () => {
    const occs: TestOcc[] = [{ scheduled_for: "2026-11-26", status: "pending" }];
    expect(filterAbsenceOccurrences(occs, RANGE)).toEqual(occs);
  });

  it("filtra pending mas mantém completed no mesmo período", () => {
    const pending: TestOcc = { scheduled_for: "2026-11-21", status: "pending" };
    const completed: TestOcc = { scheduled_for: "2026-11-21", status: "completed" };
    expect(filterAbsenceOccurrences([pending, completed], RANGE)).toEqual([completed]);
  });
});
