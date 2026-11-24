import { describe, expect, it } from "vitest";
import { formatHourShort, getHeroPeriod, periodForHour } from "./index";

describe("periodForHour", () => {
  it.each([
    [4, "night"], [5, "morning"], [11, "morning"], [12, "afternoon"],
    [17, "afternoon"], [18, "night"], [23, "night"], [0, "night"],
  ] as const)("%ih → %s", (h, p) => expect(periodForHour(h)).toBe(p));
});

describe("getHeroPeriod", () => {
  it("usa o fuso da casa, não o do servidor", () => {
    // 13h UTC = 10h em São Paulo (manhã) e 22h em Tóquio (noite)
    const now = new Date("2026-11-23T13:00:00Z");
    expect(getHeroPeriod("America/Sao_Paulo", now)).toBe("morning");
    expect(getHeroPeriod("Asia/Tokyo", now)).toBe("night");
  });
});

describe("formatHourShort", () => {
  it("formata horas cheias e quebradas", () => {
    expect(formatHourShort("10:00:00")).toBe("10h");
    expect(formatHourShort("09:30:00")).toBe("9h30");
    expect(formatHourShort(null)).toBeNull();
  });
});
