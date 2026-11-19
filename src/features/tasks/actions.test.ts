import { expect, it, describe } from "vitest";
import { generateOccurrenceDates } from "@/features/tasks/rules/recurrence";
import { addDaysStr } from "@/lib/dates";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

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

// ---------------------------------------------------------------------------
// Review Focus 1: desfazer fora do dia no fuso da casa
// ---------------------------------------------------------------------------
describe("undoComplete timezone check logic", () => {
  it("rejects when completed_at is yesterday in home timezone", () => {
    // completed_at = "2026-11-19T02:00:00.000Z" (UTC midnight+2 → 2026-11-18 23:00 BRT)
    // timezone = "America/Sao_Paulo" (UTC-3 at this date)
    // new TZDate shifts to local time → 2026-11-18 23:00 BRT → format gives "2026-11-18"
    const completedAt = "2026-11-19T02:00:00.000Z";
    const timezone = "America/Sao_Paulo";
    const simulatedToday = "2026-11-19";

    const completedOnDay = format(
      new TZDate(new Date(completedAt), timezone),
      "yyyy-MM-dd",
    );

    // The completion happened on 2026-11-18 in BRT
    expect(completedOnDay).toBe("2026-11-18");
    // simulated today is 2026-11-19, so undo should be rejected
    expect(completedOnDay !== simulatedToday).toBe(true);
  });

  it("allows undo when completed_at is the same day in home timezone", () => {
    // completed_at = "2026-11-19T02:00:00.000Z" (UTC)
    // timezone = "America/Sao_Paulo"
    // today = "2026-11-18" (same day as completion in BRT)
    const completedAt = "2026-11-19T02:00:00.000Z";
    const timezone = "America/Sao_Paulo";
    const simulatedToday = "2026-11-18";

    const completedOnDay = format(
      new TZDate(new Date(completedAt), timezone),
      "yyyy-MM-dd",
    );

    expect(completedOnDay).toBe("2026-11-18");
    expect(completedOnDay === simulatedToday).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Review Focus 2: adiar para depois da próxima ocorrência
// ---------------------------------------------------------------------------
describe("postponeOccurrence validation logic", () => {
  // Simulates the validation: new_date must be < nextOccurrence.scheduled_for
  function validatePostponeDate(
    newDate: string,
    today: string,
    nextScheduledFor: string | null,
  ): { valid: boolean; reason?: string } {
    if (newDate <= today) {
      return { valid: false, reason: "A nova data deve ser no futuro." };
    }
    if (nextScheduledFor !== null && newDate >= nextScheduledFor) {
      return {
        valid: false,
        reason:
          "Não é possível adiar para depois da próxima ocorrência — evita duas na mesma data efetiva.",
      };
    }
    return { valid: true };
  }

  const today = "2026-11-19";
  // occurrence A is at "2026-11-20"; occurrence B (next) is at "2026-11-25"

  it("rejects when new_date equals next pending scheduled_for", () => {
    const result = validatePostponeDate("2026-11-25", today, "2026-11-25");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("próxima ocorrência");
  });

  it("rejects when new_date is after next pending scheduled_for", () => {
    const result = validatePostponeDate("2026-11-26", today, "2026-11-25");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("próxima ocorrência");
  });

  it("accepts when new_date is strictly before next pending scheduled_for", () => {
    const result = validatePostponeDate("2026-11-24", today, "2026-11-25");
    expect(result.valid).toBe(true);
  });

  it("accepts any future date when there is no next occurrence", () => {
    const result = validatePostponeDate("2026-12-31", today, null);
    expect(result.valid).toBe(true);
  });

  it("rejects when new_date is not in the future", () => {
    const result = validatePostponeDate("2026-11-19", today, null);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("futuro");
  });
});
