import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extendWindow } from "./extend-window";

type Rec = { table: string; op: string; payload?: unknown; filters: string[] };

function fakeSupabase(routines: unknown[], opts: { failFirstUpsert?: boolean } = {}) {
  const recs: Rec[] = [];
  let upserts = 0;
  const from = vi.fn((table: string) => {
    const rec: Rec = { table, op: "select", filters: [] };
    recs.push(rec);
    const b: Record<string, unknown> = {};
    const self = () => b;
    b.select = (cols: string) => { rec.filters.push(`select:${cols}`); return b; };
    b.eq = (c: string, v: unknown) => { rec.filters.push(`eq:${c}=${String(v)}`); return b; };
    b.filter = self;
    b.lt = self;
    b.is = self;
    b.or = (expr: string) => { rec.filters.push(`or:${expr}`); return b; };
    b.update = (payload: unknown) => { rec.op = "update"; rec.payload = payload; return b; };
    b.upsert = (payload: unknown) => {
      rec.op = "upsert";
      rec.payload = payload;
      upserts += 1;
      if (opts.failFirstUpsert && upserts === 1) return Promise.reject(new Error("boom"));
      return Promise.resolve({ data: null, error: null });
    };
    b.then = (resolve: (v: unknown) => void) => resolve({ data: table === "routines" && rec.op === "select" ? routines : null, error: null });
    return b;
  });
  return { client: { from } as never, recs };
}

const daily = (id: string, generated_until: string | null) => ({
  id, task_id: `t-${id}`, frequency_type: "daily", interval_value: null, interval_unit: null,
  weekdays: null, month_day: null, start_date: "2026-11-24", end_date: null,
  generated_until, ungenerated_count: 0,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-24T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("extendWindow", () => {
  it("uma só consulta de rotinas (nada de duas consultas + select *)", async () => {
    const { client, recs } = fakeSupabase([]);
    await extendWindow(client, "h1", "UTC");
    const routineQueries = recs.filter((r) => r.table === "routines");
    expect(routineQueries).toHaveLength(1);
    const f = routineQueries[0]!.filters.join(" ");
    expect(f).not.toContain("select:*");
    expect(f).toContain("or:generated_until.is.null,generated_until.lt.2026-12-22"); // hoje + 28
  });

  it("sem rotinas abaixo do limite não grava nada", async () => {
    const { client, recs } = fakeSupabase([]);
    await extendWindow(client, "h1", "UTC");
    expect(recs.some((r) => r.op === "upsert" || r.op === "update")).toBe(false);
  });

  it("rotina diária nunca gerada: cria de hoje até hoje+56 e avança generated_until", async () => {
    const { client, recs } = fakeSupabase([daily("r1", null)]);
    await extendWindow(client, "h1", "UTC");
    const up = recs.find((r) => r.op === "upsert")!;
    const rows = up.payload as Array<{ original_date: string; task_id: string; home_id: string }>;
    expect(rows).toHaveLength(57);
    expect(rows[0]).toMatchObject({ original_date: "2026-11-24", task_id: "t-r1", home_id: "h1" });
    expect(rows.at(-1)!.original_date).toBe("2027-01-19");
    const upd = recs.find((r) => r.op === "update")!;
    expect(upd.payload).toEqual({ generated_until: "2027-01-19" });
  });

  it("erro numa rotina não impede as demais", async () => {
    const { client, recs } = fakeSupabase([daily("r1", null), daily("r2", null)], { failFirstUpsert: true });
    await expect(extendWindow(client, "h1", "UTC")).resolves.toBeUndefined();
    const updates = recs.filter((r) => r.op === "update");
    expect(updates).toHaveLength(1); // a segunda seguiu
  });
});
