import { expect, it } from "vitest";
import { generateOccurrenceDates } from "@/features/tasks/rules/recurrence";
import { addDaysStr } from "@/lib/dates";

it("generateOccurrenceDates handles fromDate 180 days before toDate in one call", () => {
  const today = "2026-11-18";
  const fromDate = addDaysStr(today, -180); // "2026-05-22"
  const toDate = addDaysStr(today, 56);    // "2027-01-13"
  const rule = { frequency_type: "daily" as const, start_date: fromDate,
    interval_value: null, interval_unit: null, weekdays: null, month_day: null, end_date: null };
  const dates = generateOccurrenceDates(rule, fromDate, toDate);
  // 180 + 1 + 56 = 237 days
  expect(dates.length).toBe(237);
  expect(dates[0]).toBe(fromDate);
  expect(dates[dates.length - 1]).toBe(toDate);
});
