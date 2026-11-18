import { describe, expect, it } from "vitest";
import { filterCatalog } from "./catalog";

describe("filterCatalog", () => {
  it("returns no tasks for 0 minutes", () => {
    expect(filterCatalog(["cozinha"], "detalhada", 0)).toHaveLength(0);
  });

  it("detalhada returns more tasks than leve for same room/minutes", () => {
    const leve = filterCatalog(["sala"], "leve", 120);
    const det = filterCatalog(["sala"], "detalhada", 120);
    expect(det.length).toBeGreaterThanOrEqual(leve.length);
  });

  it("filters to rooms present", () => {
    const tasks = filterCatalog(["quarto"], "equilibrada", 999);
    expect(tasks.every((t) => t.room_type === "quarto")).toBe(true);
  });

  it("respects available minutes (soft hint — at least 1 task returned when minutes > 0 and catalog has entries)", () => {
    const tasks = filterCatalog(["cozinha"], "leve", 20);
    expect(tasks.length).toBeGreaterThan(0);
  });
});
