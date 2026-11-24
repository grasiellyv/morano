import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addShoppingItem } from "./add-item";

function fakeSupabase() {
  const rpc = vi.fn().mockResolvedValue({ data: { result: "inserted" }, error: null });
  return { client: { rpc } as unknown as SupabaseClient<never>, rpc };
}

const base = { homeId: "h1", name: "Leite", quantity: 1, unit: "un" as const };

describe("addShoppingItem", () => {
  it("envia o evento para a RPC", async () => {
    const { client, rpc } = fakeSupabase();
    await addShoppingItem(client as never, { ...base, eventId: "e1" });
    expect(rpc).toHaveBeenCalledWith("add_shopping_item", expect.objectContaining({ p_event_id: "e1" }));
  });

  it("sem evento omite p_event_id (a função usa o default; funciona antes e depois da migration)", async () => {
    const { client, rpc } = fakeSupabase();
    await addShoppingItem(client as never, base);
    expect(rpc.mock.calls[0]![1]).not.toHaveProperty("p_event_id");
  });
});
