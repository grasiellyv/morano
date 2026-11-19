import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalDateString } from "@/lib/dates";
import { generateOccurrenceDates, type RoutineRule } from "./recurrence";

// Helper to build a RoutineRule with defaults for nullable fields
function rule(
  overrides: Pick<RoutineRule, "frequency_type" | "start_date"> &
    Partial<RoutineRule>,
): RoutineRule {
  return {
    interval_value: null,
    interval_unit: null,
    weekdays: null,
    month_day: null,
    end_date: null,
    ...overrides,
  };
}

// ─── once ────────────────────────────────────────────────────────────────────

describe("once", () => {
  it("returns start_date when in range", () => {
    const r = rule({ frequency_type: "once", start_date: "2026-11-15" });
    expect(generateOccurrenceDates(r, "2026-11-01", "2026-11-30")).toEqual([
      "2026-11-15",
    ]);
  });

  it("returns [] when start_date is before fromDate", () => {
    const r = rule({ frequency_type: "once", start_date: "2026-10-31" });
    expect(generateOccurrenceDates(r, "2026-11-01", "2026-11-30")).toEqual([]);
  });

  it("returns [] when start_date is after toDate", () => {
    const r = rule({ frequency_type: "once", start_date: "2026-12-01" });
    expect(generateOccurrenceDates(r, "2026-11-01", "2026-11-30")).toEqual([]);
  });
});

// ─── daily ───────────────────────────────────────────────────────────────────

describe("daily", () => {
  it("generates every day in range", () => {
    const r = rule({ frequency_type: "daily", start_date: "2026-11-01" });
    expect(generateOccurrenceDates(r, "2026-11-05", "2026-11-07")).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
  });

  it("starts at start_date when start_date is after fromDate", () => {
    const r = rule({ frequency_type: "daily", start_date: "2026-11-05" });
    expect(generateOccurrenceDates(r, "2026-11-01", "2026-11-07")).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
  });
});

// ─── biweekly ────────────────────────────────────────────────────────────────

describe("biweekly", () => {
  it("generates every 14 days", () => {
    const r = rule({ frequency_type: "biweekly", start_date: "2026-11-01" });
    expect(generateOccurrenceDates(r, "2026-11-01", "2026-12-15")).toEqual([
      "2026-11-01",
      "2026-11-15",
      "2026-11-29",
      "2026-12-13",
    ]);
  });
});

// ─── monthly ─────────────────────────────────────────────────────────────────

describe("monthly", () => {
  it("on Dec 31 generates Jan 31 (virada de ano)", () => {
    const r = rule({ frequency_type: "monthly", start_date: "2026-12-31" });
    expect(generateOccurrenceDates(r, "2027-01-01", "2027-01-31")).toEqual([
      "2027-01-31",
    ]);
  });

  it("on Nov 30 generates Dec 30 and Jan 30", () => {
    const r = rule({ frequency_type: "monthly", start_date: "2026-11-30" });
    expect(generateOccurrenceDates(r, "2026-12-01", "2027-01-31")).toEqual([
      "2026-12-30",
      "2027-01-30",
    ]);
  });

  it("on Jan 31 2024 (ano bissexto) generates Feb 29 2024", () => {
    const r = rule({ frequency_type: "monthly", start_date: "2024-01-31" });
    expect(generateOccurrenceDates(r, "2024-02-01", "2024-02-29")).toEqual([
      "2024-02-29",
    ]);
  });

  it("on Jan 31 2023 (ano comum) generates Feb 28 2023", () => {
    const r = rule({ frequency_type: "monthly", start_date: "2023-01-31" });
    expect(generateOccurrenceDates(r, "2023-02-01", "2023-02-28")).toEqual([
      "2023-02-28",
    ]);
  });

  it("day 31: jan→feb→mar→apr gives 31, 28, 31, 30", () => {
    const r = rule({ frequency_type: "monthly", start_date: "2026-01-31" });
    expect(generateOccurrenceDates(r, "2026-01-01", "2026-04-30")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });
});

// ─── fromDate / end_date boundary ────────────────────────────────────────────

describe("date boundaries", () => {
  it("skips dates before fromDate even if rule would generate them", () => {
    // weekly from 2026-11-01, ask for window starting 2026-11-10
    // occurrences: …01, 08, 15, 22, 29; expect only 15, 22, 29
    const r = rule({ frequency_type: "weekly", start_date: "2026-11-01" });
    expect(generateOccurrenceDates(r, "2026-11-10", "2026-11-30")).toEqual([
      "2026-11-15",
      "2026-11-22",
      "2026-11-29",
    ]);
  });

  it("stops at end_date even when toDate is later", () => {
    const r = rule({
      frequency_type: "daily",
      start_date: "2026-11-01",
      end_date: "2026-11-05",
    });
    expect(generateOccurrenceDates(r, "2026-11-01", "2026-11-30")).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
  });
});

// ─── getLocalDateString (timezone / DST) ─────────────────────────────────────

describe("getLocalDateString", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("at 02:00 UTC returns previous day in America/Sao_Paulo (UTC-3)", () => {
    // 2026-11-19T02:00:00Z = 2026-11-18T23:00:00-03:00  →  "2026-11-18"
    vi.setSystemTime(new Date("2026-11-19T02:00:00Z"));
    expect(getLocalDateString("America/Sao_Paulo")).toBe("2026-11-18");
  });

  it("at 04:00 UTC returns same day in America/Sao_Paulo (UTC-3)", () => {
    // 2026-11-19T04:00:00Z = 2026-11-19T01:00:00-03:00  →  "2026-11-19"
    vi.setSystemTime(new Date("2026-11-19T04:00:00Z"));
    expect(getLocalDateString("America/Sao_Paulo")).toBe("2026-11-19");
  });
});
