import { describe, expect, it } from "vitest";
import { filterCatalog, onboardingTaskRow } from "./catalog";

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

describe("onboardingTaskRow — cômodo e prioridade vêm do catálogo (não do cliente)", () => {
  const rooms = [
    { id: "r-sala", room_type: "sala", position: 1 },
    { id: "r-coz", room_type: "cozinha", position: 0 },
    { id: "r-q2", room_type: "quarto", position: 3 },
    { id: "r-q1", room_type: "quarto", position: 2 },
  ];

  it("a mesma tarefa de cômodos diferentes cai no cômodo certo", () => {
    expect(onboardingTaskRow("cozinha_varrer_chao", rooms)).toEqual({ room_id: "r-coz", priority: "alta" });
    expect(onboardingTaskRow("sala_varrer_chao", rooms)).toEqual({ room_id: "r-sala", priority: "alta" });
  });

  it("vários cômodos do mesmo tipo: usa o primeiro (menor posição)", () => {
    const row = onboardingTaskRow("quarto_passar_aspirador", rooms);
    expect(row.room_id).toBe("r-q1");
  });

  it("tipo de cômodo que a casa não tem fica sem cômodo", () => {
    expect(onboardingTaskRow("banheiro_limpar_rejunte", rooms).room_id).toBeNull();
  });

  it("id desconhecido (ou forjado) vira prioridade média e sem cômodo", () => {
    expect(onboardingTaskRow("nao_existe", rooms)).toEqual({ room_id: null, priority: "media" });
  });
});
