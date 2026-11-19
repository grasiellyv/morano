import { describe, it, expect } from "vitest";
import { applyRetroactivePolicy } from "./missed-policy";

describe("applyRetroactivePolicy", () => {
  const today = "2026-11-18";

  it("policy_no_retroactive: empty input returns empty toInsert and zero count", () => {
    const r = applyRetroactivePolicy([], today);
    expect(r.toInsert).toEqual([]);
    expect(r.ungeneratedCount).toBe(0);
  });

  it("policy_all_in_window_under_limit: 2 dates within 30d window all inserted", () => {
    const dates = ["2026-11-10", "2026-11-15"];  // both within [today-30, today-1]
    const r = applyRetroactivePolicy(dates, today);
    expect(r.toInsert).toEqual(["2026-11-10", "2026-11-15"]);
    expect(r.ungeneratedCount).toBe(0);
  });

  it("policy_exactly_three_in_window: 3 dates → all inserted, count = 0", () => {
    const dates = ["2026-11-05", "2026-11-10", "2026-11-15"];
    const r = applyRetroactivePolicy(dates, today);
    expect(r.toInsert).toEqual(["2026-11-05", "2026-11-10", "2026-11-15"]);
    expect(r.ungeneratedCount).toBe(0);
  });

  it("policy_over_limit_in_window: 5 dates in window → keep last 3, count = 2", () => {
    // today = 2026-11-18, windowStart = 2026-10-19
    const dates = [
      "2026-10-20", "2026-10-25", "2026-11-01", "2026-11-08", "2026-11-15",
    ];
    const r = applyRetroactivePolicy(dates, today);
    expect(r.toInsert).toEqual(["2026-11-01", "2026-11-08", "2026-11-15"]);
    expect(r.ungeneratedCount).toBe(2);
  });

  it("policy_before_window: dates older than 30d not inserted, counted", () => {
    // today = 2026-11-18, windowStart = 2026-10-19 (inclusive)
    // 2026-10-01 is 48 days ago → before window
    const dates = ["2026-10-01", "2026-10-05"];
    const r = applyRetroactivePolicy(dates, today);
    expect(r.toInsert).toEqual([]);
    expect(r.ungeneratedCount).toBe(2);
  });

  it("policy_window_boundary: date exactly at today-30 is included", () => {
    // today = 2026-11-18, today-30 = 2026-10-19
    const dates = ["2026-10-19"];
    const r = applyRetroactivePolicy(dates, today);
    expect(r.toInsert).toEqual(["2026-10-19"]);
    expect(r.ungeneratedCount).toBe(0);
  });

  it("policy_day_before_window: date at today-31 is NOT in window", () => {
    // today = 2026-11-18, today-30 = 2026-10-19, today-31 = 2026-10-18
    const r = applyRetroactivePolicy(["2026-10-18"], today);
    expect(r.toInsert).toEqual([]);
    expect(r.ungeneratedCount).toBe(1);
  });

  it("policy_first_open_old_start_date: mixed before+in-window with over-limit", () => {
    // 3 before window, 5 in window → toInsert = last 3 of in-window, count = 3+2 = 5
    const before = ["2026-09-01", "2026-09-15", "2026-10-01"];
    const inWindow = [
      "2026-10-20", "2026-10-27", "2026-11-03", "2026-11-10", "2026-11-15",
    ];
    const r = applyRetroactivePolicy([...before, ...inWindow], today);
    expect(r.toInsert).toEqual(["2026-11-03", "2026-11-10", "2026-11-15"]);
    expect(r.ungeneratedCount).toBe(5);
  });

  it("policy_once_before_window: single date before window → count = 1", () => {
    const r = applyRetroactivePolicy(["2026-09-01"], today);
    expect(r.toInsert).toEqual([]);
    expect(r.ungeneratedCount).toBe(1);
  });
});
