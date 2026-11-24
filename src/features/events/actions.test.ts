import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
let duplicate: { id: string } | null = null;

function fakeSupabase() {
  return {
    from(table: string) {
      const b: Record<string, unknown> = {};
      const self = () => b;
      b.select = self;
      b.eq = self;
      b.gte = self;
      b.limit = self;
      b.insert = (row: unknown) => { insert(row); return b; };
      b.maybeSingle = async () =>
        table === "profiles" ? { data: { current_home_id: "h1" }, error: null } : { data: duplicate, error: null };
      b.single = async () => ({ data: { id: "novo" }, error: null });
      return b;
    },
  };
}

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "u1", email: "u@x.com" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeSupabase() }));
vi.mock("@/features/members/permissions", () => ({ getMemberPermissions: async () => ({ bypass: true }) }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const addEventItems = vi.fn();
vi.mock("@/features/events/save-items", () => ({ addEventItems: (...a: unknown[]) => addEventItems(...a) }));

import { createEvent } from "./actions";

function form(items: unknown[] = []) {
  const fd = new FormData();
  fd.set("title", "Visita Teste");
  fd.set("event_type", "visita");
  fd.set("start_date", "2026-12-01");
  fd.set("items", JSON.stringify(items));
  return fd;
}

const leite = { name: "Leite", quantity: 1, unit: "un", category_id: null };

beforeEach(() => {
  insert.mockReset();
  addEventItems.mockReset();
  addEventItems.mockResolvedValue([{ name: "Leite", result: { result: "inserted" } }]);
  duplicate = null;
});

describe("createEvent — idempotência", () => {
  it("evento novo é inserido e recebe os itens", async () => {
    const res = await createEvent({ status: "idle" }, form([leite]));
    expect(insert).toHaveBeenCalledTimes(1);
    expect(addEventItems).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ eventId: "novo" }));
    expect(res.status).toBe("success");
  });

  it("reenvio idêntico poucos segundos depois não cria outro evento: reaproveita o existente", async () => {
    duplicate = { id: "existente" };
    const res = await createEvent({ status: "idle" }, form([leite]));
    expect(insert).not.toHaveBeenCalled();
    expect(addEventItems).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ eventId: "existente" }));
    expect(res.status).toBe("success");
  });
});
