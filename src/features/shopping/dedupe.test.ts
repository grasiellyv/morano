import { describe, expect, it } from "vitest";
import { findDuplicate, historyProducts, normalizeName } from "./dedupe";
import { timeAgo } from "./time-ago";

describe("normalizeName", () => {
  it("ignora acento, caixa e espaços", () => {
    expect(normalizeName("  Açúcar   REFINADO ")).toBe("acucar refinado");
    expect(normalizeName("Feijão")).toBe(normalizeName("feijao"));
  });
});

describe("findDuplicate", () => {
  const items = [{ name: "Leite integral", id: "1" }, { name: "Pão", id: "2" }];
  it("acha pelo nome normalizado", () => {
    expect(findDuplicate(items, "leite INTEGRAL")?.id).toBe("1");
    expect(findDuplicate(items, "pao")?.id).toBe("2");
  });
  it("não confunde nomes parecidos nem vazios", () => {
    expect(findDuplicate(items, "Leite")).toBeNull();
    expect(findDuplicate(items, "   ")).toBeNull();
  });
});

describe("historyProducts", () => {
  const sessions = [
    { finished_at: "2026-11-01T10:00:00Z", items: [{ name: "Leite", quantity: 6, unit: "un", category_id: "c1" }, { name: "Café" }] },
    { finished_at: "2026-11-20T10:00:00Z", items: [{ name: "leite", quantity: 2, unit: "l" }, { name: "Arroz", quantity: "x" }] },
    { finished_at: "2026-11-21T10:00:00Z", items: "invalido" },
  ];
  it("não repete e prefere a compra mais recente", () => {
    const h = historyProducts(sessions);
    expect(h.map((p) => p.name)).toEqual(["leite", "Arroz", "Café"]);
    expect(h[0]).toMatchObject({ quantity: 2, unit: "l", category_id: null });
  });
  it("usa 1 un quando faltam quantidade/unidade válidas", () => {
    const h = historyProducts(sessions);
    expect(h.find((p) => p.name === "Arroz")).toMatchObject({ quantity: 1, unit: "un" });
    expect(h.find((p) => p.name === "Café")).toMatchObject({ quantity: 1, unit: "un" });
  });
  it("respeita o limite", () => {
    expect(historyProducts(sessions, 2)).toHaveLength(2);
  });
  it("conta em quantas compras o produto apareceu (nome sem acento/caixa)", () => {
    const h = historyProducts(sessions);
    expect(h.find((p) => p.name === "leite")!.times).toBe(2);
    expect(h.find((p) => p.name === "Café")!.times).toBe(1);
  });
  it("os mais pedidos vêm primeiro, mesmo que a última compra seja antiga", () => {
    const many = [
      { finished_at: "2026-09-01T10:00:00Z", items: [{ name: "Arroz" }] },
      { finished_at: "2026-10-01T10:00:00Z", items: [{ name: "Arroz" }, { name: "Novidade" }] },
      { finished_at: "2026-10-15T10:00:00Z", items: [{ name: "Arroz" }] },
      { finished_at: "2026-11-20T10:00:00Z", items: [{ name: "Outro" }] },
    ];
    expect(historyProducts(many).map((p) => p.name)).toEqual(["Arroz", "Outro", "Novidade"]);
  });
  it("o limite corta DEPOIS de ordenar por frequência", () => {
    const many = [
      { finished_at: "2026-09-01T10:00:00Z", items: [{ name: "Frequente" }] },
      { finished_at: "2026-10-01T10:00:00Z", items: [{ name: "Frequente" }] },
      { finished_at: "2026-11-20T10:00:00Z", items: [{ name: "Recente1" }, { name: "Recente2" }] },
    ];
    expect(historyProducts(many, 1).map((p) => p.name)).toEqual(["Frequente"]);
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  it.each([
    ["2026-11-23T11:59:40Z", "agora"],
    ["2026-11-23T11:59:00Z", "há 1 minuto"],
    ["2026-11-23T11:55:00Z", "há 5 minutos"],
    ["2026-11-23T10:00:00Z", "há 2 horas"],
    ["2026-11-21T12:00:00Z", "há 2 dias"],
  ])("%s → %s", (iso, label) => expect(timeAgo(iso, now)).toBe(label));
  it("sem data", () => expect(timeAgo(null, now)).toBe("sem atualizações"));
  it("data no futuro (relógio diferente) vira agora", () => expect(timeAgo("2026-11-23T12:05:00Z", now)).toBe("agora"));
});
