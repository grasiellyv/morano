import { describe, expect, it } from "vitest";
import { groupByDay } from "./group-by-day";

describe("groupByDay", () => {
  const timezone = "America/Sao_Paulo";
  const today = "2026-11-24";

  it("agrupa HOJE e ONTEM corretamente", () => {
    const rows = [
      { id: "a", created_at: "2026-11-24T14:00:00.000Z" }, // 11h BRT hoje
      { id: "b", created_at: "2026-11-23T14:00:00.000Z" }, // 11h BRT ontem
    ];
    const groups = groupByDay(rows, timezone, today);
    expect(groups.map((g) => g.label)).toEqual(["HOJE", "ONTEM"]);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(["a"]);
    expect(groups[1]!.items.map((i) => i.id)).toEqual(["b"]);
  });

  it("datas mais antigas usam label formatado, mais recente primeiro", () => {
    const rows = [{ id: "c", created_at: "2026-11-20T14:00:00.000Z" }];
    const groups = groupByDay(rows, timezone, today);
    expect(groups[0]!.label).not.toBe("HOJE");
    expect(groups[0]!.label).not.toBe("ONTEM");
  });

  it("lista vazia retorna grupos vazios", () => {
    expect(groupByDay([], timezone, today)).toEqual([]);
  });
});
