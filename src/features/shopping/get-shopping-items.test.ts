import { describe, expect, it, vi } from "vitest";
import { getShoppingItems, PURCHASED_ITEMS_LIMIT } from "./queries";

type Call = { eq: Array<[string, unknown]>; limit?: number; order: string[] };

function raw(id: string, purchased: boolean) {
  return {
    id, name: id, category_id: null, notes: null, room_id: null, quantity: 1, unit: "un",
    is_purchased: purchased, purchased_at: purchased ? "2026-11-24T10:00:00Z" : null,
    created_at: "2026-11-24T09:00:00Z", updated_at: "2026-11-24T09:00:00Z", mission: null, priority: "normal",
    created_by: null, purchased_by: null, category: null, room: null, event: null,
    added_by_profile: { full_name: "Pessoa" }, purchased_by_profile: null,
  };
}

function fakeSupabase(rowsPending: unknown[], rowsPurchased: unknown[]) {
  const calls: Call[] = [];
  const from = vi.fn(() => {
    const call: Call = { eq: [], order: [] };
    calls.push(call);
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = (c: string, v: unknown) => { call.eq.push([c, v]); return b; };
    b.order = (c: string) => { call.order.push(c); return b; };
    b.limit = (n: number) => { call.limit = n; return b; };
    b.then = (resolve: (v: unknown) => void) => {
      const purchased = call.eq.some(([c, v]) => c === "is_purchased" && v === true);
      resolve({ data: purchased ? rowsPurchased : rowsPending, error: null });
    };
    return b;
  });
  return { client: { from } as never, calls };
}

describe("getShoppingItems", () => {
  it("pendentes completos; comprados limitados aos mais recentes (a lista não cresce para sempre)", async () => {
    const { client, calls } = fakeSupabase([raw("p1", false), raw("p2", false)], [raw("c1", true)]);
    const r = await getShoppingItems(client, "h1");
    expect(calls).toHaveLength(2);
    const pending = calls.find((c) => c.eq.some(([k, v]) => k === "is_purchased" && v === false))!;
    const purchased = calls.find((c) => c.eq.some(([k, v]) => k === "is_purchased" && v === true))!;
    expect(pending.limit).toBeUndefined();
    expect(purchased.limit).toBe(PURCHASED_ITEMS_LIMIT);
    expect(purchased.order[0]).toBe("purchased_at");
    expect(r.pending.map((i) => i.id)).toEqual(["p1", "p2"]);
    expect(r.purchased.map((i) => i.id)).toEqual(["c1"]);
    expect(r.pending[0]!.added_by_name).toBe("Pessoa");
  });

  it("purchasedLimit: 0 nem consulta os comprados (Início só precisa dos pendentes)", async () => {
    const { client, calls } = fakeSupabase([raw("p1", false)], [raw("c1", true)]);
    const r = await getShoppingItems(client, "h1", { purchasedLimit: 0 });
    expect(calls).toHaveLength(1);
    expect(r.purchased).toEqual([]);
    expect(r.pending).toHaveLength(1);
  });

  it("filtra sempre pela casa", async () => {
    const { client, calls } = fakeSupabase([], []);
    await getShoppingItems(client, "h1");
    for (const c of calls) expect(c.eq).toContainEqual(["home_id", "h1"]);
  });
});
