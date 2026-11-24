import { describe, expect, it, vi } from "vitest";
import { addEventItems } from "./save-items";

const items = [
  { name: "Leite", quantity: 2, unit: "l" as const, category_id: "11111111-1111-4111-8111-111111111111" },
  { name: "Café", quantity: 1, unit: "un" as const, category_id: null },
];

function fakeSupabase(responses: unknown[]) {
  const rpc = vi.fn();
  for (const r of responses) rpc.mockResolvedValueOnce({ data: r, error: null });
  return { client: { rpc } as never, rpc };
}

describe("addEventItems", () => {
  it("manda cada item com evento, missão Ocasiões e nota com o título", async () => {
    const { client, rpc } = fakeSupabase([{ result: "inserted" }, { result: "inserted" }]);
    const results = await addEventItems(client, { homeId: "h1", eventId: "e1", title: "Visita Teste", items, canManageShopping: true });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "add_shopping_item", expect.objectContaining({
      p_home_id: "h1", p_name: "Leite", p_quantity: 2, p_unit: "l", p_event_id: "e1",
      p_mission: "ocasioes", p_notes: "Para: Visita Teste", p_category_id: items[0]!.category_id,
    }));
    expect(results.map((r) => r.result.result)).toEqual(["inserted", "inserted"]);
  });

  it("sem permissão de Compras não chama a RPC e marca tudo como proibido", async () => {
    const { client, rpc } = fakeSupabase([]);
    const results = await addEventItems(client, { homeId: "h1", eventId: "e1", title: "X", items, canManageShopping: false });
    expect(rpc).not.toHaveBeenCalled();
    expect(results).toEqual([
      { name: "Leite", result: { result: "error", forbidden: true } },
      { name: "Café", result: { result: "error", forbidden: true } },
    ]);
  });

  it("um item que falha não impede os outros", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: "XX000" } })
      .mockResolvedValueOnce({ data: { result: "inserted" }, error: null });
    const results = await addEventItems({ rpc } as never, { homeId: "h1", eventId: "e1", title: "X", items, canManageShopping: true });
    expect(results[0]!.result).toEqual({ result: "error", forbidden: false });
    expect(results[1]!.result.result).toBe("inserted");
  });

  it("título longo é cortado na nota (limite de 200)", async () => {
    const { client, rpc } = fakeSupabase([{ result: "inserted" }]);
    await addEventItems(client, { homeId: "h1", eventId: "e1", title: "A".repeat(300), items: [items[1]!], canManageShopping: true });
    const notes = (rpc.mock.calls[0]![1] as { p_notes: string }).p_notes;
    expect(notes.length).toBe(200);
  });
});
