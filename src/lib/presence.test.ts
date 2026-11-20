import { describe, it, expect } from "vitest";
import { shouldUpdatePresence } from "./presence";

describe("shouldUpdatePresence", () => {
  const now = new Date("2026-11-20T12:00:00.000Z");

  it("retorna true quando last_seen_at é null", () => {
    expect(shouldUpdatePresence(null, now)).toBe(true);
  });

  it("retorna false quando last_seen_at há menos de 15 minutos", () => {
    const recent = new Date(now.getTime() - 14 * 60 * 1000).toISOString();
    expect(shouldUpdatePresence(recent, now)).toBe(false);
  });

  it("retorna true quando last_seen_at há exatamente 15 minutos", () => {
    const boundary = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    expect(shouldUpdatePresence(boundary, now)).toBe(true);
  });

  it("retorna true quando last_seen_at há mais de 15 minutos", () => {
    const old = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    expect(shouldUpdatePresence(old, now)).toBe(true);
  });
});
