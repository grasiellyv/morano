import { describe, expect, it, vi } from "vitest";
import { getProductSuggestionSources, ITEM_SOURCE_LIMIT, SESSION_SOURCE_LIMIT } from "./queries";

type Call = { table: string; limit?: number; eq: Array<[string, unknown]> };

function fakeSupabase(rowsByTable: Record<string, unknown[]>) {
  const calls: Call[] = [];
  const from = vi.fn((table: string) => {
    const call: Call = { table, eq: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = chain;
    builder.order = chain;
    builder.eq = (col: string, val: unknown) => { call.eq.push([col, val]); return builder; };
    builder.limit = (n: number) => { call.limit = n; return builder; };
    builder.then = (resolve: (v: unknown) => void) => resolve({ data: rowsByTable[table] ?? [], error: null });
    return builder;
  });
  return { client: { from } as never, calls };
}

describe("getProductSuggestionSources", () => {
  it("consultas leves e limitadas (nada de lista inteira nem histórico completo)", async () => {
    const { client, calls } = fakeSupabase({});
    await getProductSuggestionSources(client, "h1");
    const items = calls.find((c) => c.table === "shopping_items")!;
    const sessions = calls.find((c) => c.table === "shopping_sessions")!;
    expect(items.limit).toBe(ITEM_SOURCE_LIMIT);
    expect(sessions.limit).toBe(SESSION_SOURCE_LIMIT);
    expect(items.eq).toContainEqual(["home_id", "h1"]);
    expect(sessions.eq).toContainEqual(["home_id", "h1"]);
  });

  it("junta categorias, itens atuais e histórico no formato do autocomplete", async () => {
    const { client } = fakeSupabase({
      shopping_categories: [{ id: "c1", home_id: "h1", name: "Alimentação", icon: "apple", sort_order: 0, default_slug: "alimentacao" }],
      shopping_items: [{ name: "Leite", category_id: "c1", unit: "l" }],
      shopping_sessions: [{ finished_at: "2026-11-20T00:00:00Z", items: [{ name: "Café", quantity: 1, unit: "un", category_id: null }] }],
    });
    const sources = await getProductSuggestionSources(client, "h1");
    expect(sources.categories).toEqual([{ id: "c1", default_slug: "alimentacao" }]);
    expect(sources.home.map((h) => h.name).sort()).toEqual(["Café", "Leite"]);
  });
});
