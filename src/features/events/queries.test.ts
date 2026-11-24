import { describe, expect, it, vi } from "vitest";
import { getEventShoppingItems } from "./queries";

function fakeSupabase(result: { data: unknown; error: unknown }) {
  const inFn = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn().mockReturnValue({ select });
  return { client: { from } as never, from, inFn };
}

describe("getEventShoppingItems", () => {
  it("sem eventos não consulta o banco", async () => {
    const { client, from } = fakeSupabase({ data: [], error: null });
    expect(await getEventShoppingItems(client, [])).toEqual({});
    expect(from).not.toHaveBeenCalled();
  });

  it("agrupa os itens por evento", async () => {
    const row = (id: string, event_id: string, is_purchased = false) => ({ id, event_id, name: id, quantity: 1, unit: "un", is_purchased });
    const { client, inFn } = fakeSupabase({ data: [row("a", "e1"), row("b", "e1", true), row("c", "e2")], error: null });
    const r = await getEventShoppingItems(client, ["e1", "e2", "e3"]);
    expect(inFn).toHaveBeenCalledWith("event_id", ["e1", "e2", "e3"]);
    expect(Object.keys(r)).toEqual(["e1", "e2"]);
    expect(r["e1"]!.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("erro vira vazio", async () => {
    const { client } = fakeSupabase({ data: null, error: { message: "x" } });
    expect(await getEventShoppingItems(client, ["e1"])).toEqual({});
  });
});
