import { describe, expect, it } from "vitest";
import {
  dayHeading,
  everyMonthsLabel,
  groupByDay,
  localDay,
  mergeActivities,
  parseActivityFilter,
  reorderInfo,
  reorderLabel,
  topProducts,
  type Activity,
} from "./logic";

describe("reorderInfo", () => {
  it("soma os meses à última compra", () => {
    expect(reorderInfo("2026-09-10T12:00:00Z", 2, "2026-11-01").dueDate).toBe("2026-11-10");
  });
  it("classifica atrasado / em breve / ok", () => {
    expect(reorderInfo("2026-01-01", 1, "2026-11-23").state).toBe("atrasado");
    expect(reorderInfo("2026-10-30", 1, "2026-11-23").state).toBe("em_breve"); // vence 30/11
    expect(reorderInfo("2026-11-20", 6, "2026-11-23").state).toBe("ok");
  });
  it("rotula em português", () => {
    expect(reorderLabel({ dueDate: "", daysUntil: -1, state: "atrasado" })).toBe("Atrasado há 1 dia");
    expect(reorderLabel({ dueDate: "", daysUntil: -5, state: "atrasado" })).toBe("Atrasado há 5 dias");
    expect(reorderLabel({ dueDate: "", daysUntil: 0, state: "em_breve" })).toBe("Repor hoje");
    expect(reorderLabel({ dueDate: "", daysUntil: 1, state: "em_breve" })).toBe("Repor amanhã");
    expect(reorderLabel({ dueDate: "", daysUntil: 9, state: "em_breve" })).toBe("Repor em 9 dias");
  });
  it("descreve a frequência", () => {
    expect(everyMonthsLabel(1)).toBe("todo mês");
    expect(everyMonthsLabel(3)).toBe("a cada 3 meses");
    expect(everyMonthsLabel(12)).toBe("todo ano");
  });
});

describe("topProducts", () => {
  const sessions = [
    { finished_at: "2026-11-01T10:00:00Z", items: [{ name: "Leite" }, { name: "leite" }, { name: "Pão" }] },
    { finished_at: "2026-11-15T10:00:00Z", items: [{ name: "Leite " }, { name: "Café" }] },
    { finished_at: "2026-11-20T10:00:00Z", items: "invalido" },
  ];
  it("conta uma vez por compra, sem distinguir caixa, mais comprados primeiro", () => {
    const top = topProducts(sessions);
    expect(top[0]).toMatchObject({ name: "Leite", times: 2, lastAt: "2026-11-15T10:00:00Z" });
    expect(top.map((t) => t.name)).toEqual(["Leite", "Café", "Pão"]);
  });
  it("respeita o limite", () => {
    expect(topProducts(sessions, 1)).toHaveLength(1);
  });
});

const act = (key: string, kind: Activity["kind"], at: string): Activity => ({
  key, kind, at, title: key, detail: null, actorId: null,
});

describe("mergeActivities", () => {
  const a = [act("t1", "task", "2026-11-23T10:00:00Z"), act("t2", "task", "2026-11-21T10:00:00Z")];
  const b = [act("s1", "shopping", "2026-11-22T10:00:00Z")];
  const c = [act("p1", "pet", "2026-11-20T10:00:00Z"), act("m1", "member", "2026-11-19T10:00:00Z")];

  it("ordena do mais recente para o mais antigo", () => {
    expect(mergeActivities([a, b, c]).map((x) => x.key)).toEqual(["t1", "s1", "t2", "p1", "m1"]);
  });
  it("filtra por tipo; 'casa' junta moradores e animais", () => {
    expect(mergeActivities([a, b, c], "tarefas").map((x) => x.key)).toEqual(["t1", "t2"]);
    expect(mergeActivities([a, b, c], "compras").map((x) => x.key)).toEqual(["s1"]);
    expect(mergeActivities([a, b, c], "casa").map((x) => x.key)).toEqual(["p1", "m1"]);
  });
  it("respeita o limite", () => {
    expect(mergeActivities([a, b, c], "tudo", 2)).toHaveLength(2);
  });
  it("filtro inválido vira 'tudo'", () => {
    expect(parseActivityFilter("xyz")).toBe("tudo");
    expect(parseActivityFilter(undefined)).toBe("tudo");
    expect(parseActivityFilter("compras")).toBe("compras");
  });
});

describe("agrupamento por dia (fuso da casa)", () => {
  it("usa o fuso da casa, não UTC", () => {
    // 01:30 UTC de 24/11 ainda é 23/11 22:30 em São Paulo
    expect(localDay("2026-11-24T01:30:00Z", "America/Sao_Paulo")).toBe("2026-11-23");
  });
  it("agrupa itens consecutivos do mesmo dia", () => {
    const items = [
      act("a", "task", "2026-11-23T20:00:00Z"),
      act("b", "task", "2026-11-23T12:00:00Z"),
      act("c", "task", "2026-11-22T12:00:00Z"),
    ];
    const g = groupByDay(items, "America/Sao_Paulo");
    expect(g.map((x) => [x.day, x.items.length])).toEqual([["2026-11-23", 2], ["2026-11-22", 1]]);
  });
  it("títulos de dia", () => {
    expect(dayHeading("2026-11-23", "2026-11-23")).toBe("Hoje");
    expect(dayHeading("2026-11-22", "2026-11-23")).toBe("Ontem");
    expect(dayHeading("2026-11-20", "2026-11-23")).toBe("sex., 20 nov.");
  });
});
