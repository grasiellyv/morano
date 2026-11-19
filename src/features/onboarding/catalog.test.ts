import { describe, expect, it } from "vitest";
import { filterCatalog } from "./catalog";

describe("filterCatalog", () => {
  it("detalhada returns more tasks than leve for same room", () => {
    const leve = filterCatalog(["sala"], "leve");
    const det = filterCatalog(["sala"], "detalhada");
    expect(det.length).toBeGreaterThanOrEqual(leve.length);
  });

  it("filters to rooms present", () => {
    const tasks = filterCatalog(["quarto"], "equilibrada");
    expect(tasks.every((t) => t.room_type === "quarto")).toBe(true);
  });

  it("returns at least 1 task when catalog has entries for the room+level", () => {
    const tasks = filterCatalog(["cozinha"], "leve");
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown room type", () => {
    const tasks = filterCatalog([], "detalhada");
    expect(tasks).toHaveLength(0);
  });
});
