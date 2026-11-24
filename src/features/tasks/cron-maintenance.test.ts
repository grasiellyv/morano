import { beforeEach, describe, expect, it, vi } from "vitest";

const extendWindow = vi.fn();
const markMissedOccurrences = vi.fn();
const advanceRotationsIfDue = vi.fn();
const getAbsentMemberIds = vi.fn();
vi.mock("@/features/tasks/extend-window", () => ({ extendWindow: (...a: unknown[]) => extendWindow(...a) }));
vi.mock("@/features/tasks/queries", () => ({ markMissedOccurrences: (...a: unknown[]) => markMissedOccurrences(...a) }));
vi.mock("@/features/tasks/queries-rotations", () => ({
  advanceRotationsIfDue: (...a: unknown[]) => advanceRotationsIfDue(...a),
  getAbsentMemberIds: (...a: unknown[]) => getAbsentMemberIds(...a),
}));

import { runMaintenanceForDueHomes } from "./cron-maintenance";

type Home = { id: string; timezone: string };

/** Banco falso: lista de casas devidas + resultado do "claim" (update condicional) por casa. */
function fakeAdmin(homes: Home[], claimable: Record<string, boolean> = {}) {
  const homeQueries: Array<{ or?: string; limit?: number; order?: string }> = [];
  const claims: string[] = [];
  const from = vi.fn((table: string) => {
    expect(table).toBe("homes");
    const state: { op: "select" | "update"; id?: string; or?: string; limit?: number; order?: string } = { op: "select" };
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.order = (col: string) => { state.order = col; return b; };
    b.limit = (n: number) => { state.limit = n; return b; };
    b.or = (expr: string) => { state.or = expr; return b; };
    b.update = () => { state.op = "update"; return b; };
    b.eq = (_c: string, id: string) => { state.id = id; return b; };
    b.lt = () => b;
    b.is = () => b;
    b.then = (resolve: (v: unknown) => void) => {
      if (state.op === "select") {
        homeQueries.push({ or: state.or, limit: state.limit, order: state.order });
        resolve({ data: homes, error: null });
      } else {
        claims.push(state.id!);
        const ok = claimable[state.id!] !== false;
        resolve({ data: ok ? [{ id: state.id }] : [], error: null });
      }
    };
    return b;
  });
  return { client: { from } as never, homeQueries, claims };
}

const now = new Date("2026-11-25T07:00:00Z");

beforeEach(() => {
  extendWindow.mockReset().mockResolvedValue(undefined);
  markMissedOccurrences.mockReset().mockResolvedValue(undefined);
  advanceRotationsIfDue.mockReset().mockResolvedValue(undefined);
  getAbsentMemberIds.mockReset().mockResolvedValue(new Set(["u9"]));
});

describe("runMaintenanceForDueHomes", () => {
  it("só pega casas sem manutenção há 20h+ (ou nunca), as mais atrasadas primeiro, com limite", async () => {
    const { client, homeQueries } = fakeAdmin([]);
    await runMaintenanceForDueHomes(client, { now, limit: 50 });
    expect(homeQueries[0]!.or).toBe("maintenance_ran_at.is.null,maintenance_ran_at.lt.2026-11-24T11:00:00.000Z");
    expect(homeQueries[0]!.order).toBe("maintenance_ran_at");
    expect(homeQueries[0]!.limit).toBe(50);
  });

  it("roda a manutenção completa de cada casa, na data DA CASA", async () => {
    const { client } = fakeAdmin([
      { id: "h1", timezone: "America/Sao_Paulo" },
      { id: "h2", timezone: "Asia/Tokyo" },
    ]);
    const r = await runMaintenanceForDueHomes(client, { now });
    expect(r).toMatchObject({ due: 2, processed: 2, skipped: 0, failed: 0 });
    // 07:00 UTC = 04:00 em São Paulo (dia 25) e 16:00 em Tóquio (dia 25)
    expect(extendWindow).toHaveBeenCalledWith(client, "h1", "America/Sao_Paulo");
    expect(markMissedOccurrences).toHaveBeenCalledWith(client, "h1", "2026-11-25");
    expect(getAbsentMemberIds).toHaveBeenCalledWith(client, "h1", "2026-11-25");
    expect(advanceRotationsIfDue).toHaveBeenCalledWith(client, "h1", "2026-11-25", new Set(["u9"]));
    expect(markMissedOccurrences).toHaveBeenCalledWith(client, "h2", "2026-11-25");
  });

  it("a data da casa pode ser outra que a do servidor (virada de dia)", async () => {
    const { client } = fakeAdmin([{ id: "h1", timezone: "America/Sao_Paulo" }]);
    await runMaintenanceForDueHomes(client, { now: new Date("2026-11-25T01:00:00Z") }); // 22:00 do dia 24 em SP
    expect(markMissedOccurrences).toHaveBeenCalledWith(client, "h1", "2026-11-24");
  });

  it("casa que outra execução (visita ou cron paralelo) já assumiu é pulada", async () => {
    const { client } = fakeAdmin(
      [{ id: "h1", timezone: "UTC" }, { id: "h2", timezone: "UTC" }],
      { h1: false },
    );
    const r = await runMaintenanceForDueHomes(client, { now });
    expect(r).toMatchObject({ due: 2, processed: 1, skipped: 1, failed: 0 });
    expect(markMissedOccurrences).toHaveBeenCalledTimes(1);
    expect(markMissedOccurrences).toHaveBeenCalledWith(client, "h2", "2026-11-25");
  });

  it("erro numa casa não impede as outras e é contado", async () => {
    markMissedOccurrences.mockRejectedValueOnce(new Error("boom"));
    const { client } = fakeAdmin([{ id: "h1", timezone: "UTC" }, { id: "h2", timezone: "UTC" }]);
    const r = await runMaintenanceForDueHomes(client, { now });
    expect(r).toMatchObject({ due: 2, processed: 1, failed: 1 });
    expect(advanceRotationsIfDue).toHaveBeenCalledTimes(1);
  });

  it("respeita o orçamento de tempo: para antes de estourar e deixa o resto para a próxima execução", async () => {
    let t = 0;
    const clock = () => t;
    markMissedOccurrences.mockImplementation(async () => { t += 30_000; });
    const { client } = fakeAdmin([
      { id: "h1", timezone: "UTC" }, { id: "h2", timezone: "UTC" }, { id: "h3", timezone: "UTC" },
    ]);
    const r = await runMaintenanceForDueHomes(client, { now, budgetMs: 45_000, clock });
    expect(r.processed).toBe(2); // h1 (0–30s), h2 (30–60s; começou antes dos 45s); h3 já não começa
    expect(r.stoppedEarly).toBe(true);
  });

  it("sem casas devidas não faz nada", async () => {
    const { client } = fakeAdmin([]);
    expect(await runMaintenanceForDueHomes(client, { now })).toEqual({
      due: 0, processed: 0, skipped: 0, failed: 0, stoppedEarly: false,
    });
    expect(extendWindow).not.toHaveBeenCalled();
  });
});
