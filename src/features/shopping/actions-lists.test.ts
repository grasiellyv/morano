import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const updates: Array<Record<string, unknown>> = [];
let categoryRow: { id: string } | null = { id: "cat1" };
let updatedRows: Array<{ id: string }> = [{ id: "l1" }];

function fakeSupabase() {
  return {
    rpc,
    from(table: string) {
      const b: Record<string, unknown> = {};
      const self = () => b;
      b.select = self;
      b.eq = self;
      b.update = (payload: Record<string, unknown>) => {
        updates.push(payload);
        return b;
      };
      b.maybeSingle = async () =>
        table === "profiles" ? { data: { current_home_id: "h1" }, error: null } : { data: categoryRow, error: null };
      b.then = (resolve: (v: unknown) => void) => resolve({ data: updatedRows, error: null });
      return b;
    },
  };
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "u1", email: "u@x.com" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeSupabase() }));
let perms: { bypass: boolean; can_manage_shopping?: boolean } = { bypass: true };
vi.mock("@/features/members/permissions", () => ({ getMemberPermissions: async () => perms }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));

import { applyList, createList, updateList } from "./actions-lists";

const idle = { status: "idle" as const };
const LIST = "00000000-0000-4000-8000-000000000001";
const CAT = "00000000-0000-4000-8000-000000000002";

function fd(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => {
  rpc.mockReset();
  updates.length = 0;
  revalidatePath.mockReset();
  perms = { bypass: true };
  categoryRow = { id: CAT };
  updatedRows = [{ id: LIST }];
});

describe("createList — lista inteligente", () => {
  it("cria numa chamada só (atômica), com missão, categoria e itens", async () => {
    rpc.mockResolvedValue({ data: LIST, error: null });
    const items = [{ name: "Carvão", quantity: 2, unit: "kg", category_id: null }];
    const res = await createList(idle, fd({ name: "Churrasco", mission: "ocasioes", category_id: CAT, items: JSON.stringify(items) }));
    expect(res).toMatchObject({ status: "success" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("create_shopping_list", {
      p_home_id: "h1",
      p_name: "Churrasco",
      p_mission: "ocasioes",
      p_category_id: CAT,
      p_items: items,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/compras");
  });

  it("sem missão/categoria/itens manda nulo e lista vazia", async () => {
    rpc.mockResolvedValue({ data: LIST, error: null });
    await createList(idle, fd({ name: "Limpeza", mission: "", category_id: "" }));
    expect(rpc).toHaveBeenCalledWith("create_shopping_list", {
      p_home_id: "h1",
      p_name: "Limpeza",
      p_mission: null,
      p_category_id: null,
      p_items: [],
    });
  });

  it("itens inválidos ou demais não chegam ao banco", async () => {
    const tooMany = JSON.stringify(
      Array.from({ length: 51 }, (_, i) => ({ name: `I${i}`, quantity: 1, unit: "un", category_id: null })),
    );
    const r1 = await createList(idle, fd({ name: "X", items: tooMany }));
    expect(r1).toMatchObject({ status: "error", fieldErrors: { items: "No máximo 50 itens por lista." } });
    const r2 = await createList(idle, fd({ name: "X", items: "{não é json" }));
    expect(r2.status).toBe("error");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sem permissão de Compras recusa antes de ir ao banco", async () => {
    perms = { bypass: false, can_manage_shopping: false };
    const res = await createList(idle, fd({ name: "X" }));
    expect(res).toEqual({ status: "error", message: "Sem permissão para gerenciar compras." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("nome vazio vira erro de campo", async () => {
    expect(await createList(idle, fd({ name: "  " }))).toMatchObject({
      status: "error",
      fieldErrors: { name: expect.any(String) },
    });
  });

  it("erro do banco vira mensagem amigável", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await createList(idle, fd({ name: "X" }))).toEqual({
      status: "error",
      message: "Erro ao criar lista. Tente novamente.",
    });
  });
});

describe("updateList — renomear e vincular", () => {
  it("só renomeia quando missão/categoria não vêm no formulário", async () => {
    await updateList(idle, fd({ id: LIST, name: "Compras do mês" }));
    expect(updates).toEqual([{ name: "Compras do mês" }]);
  });

  it("missão e categoria vazias LIMPAM o vínculo", async () => {
    await updateList(idle, fd({ id: LIST, name: "X", mission: "", category_id: "" }));
    expect(updates).toEqual([{ name: "X", mission: null, category_id: null }]);
  });

  it("grava missão e categoria escolhidas (categoria precisa ser da casa)", async () => {
    await updateList(idle, fd({ id: LIST, name: "X", mission: "reposicao", category_id: CAT }));
    expect(updates).toEqual([{ name: "X", mission: "reposicao", category_id: CAT }]);
  });

  it("categoria que não é da casa é recusada", async () => {
    categoryRow = null;
    const res = await updateList(idle, fd({ id: LIST, name: "X", category_id: CAT }));
    expect(res).toMatchObject({ status: "error" });
    expect(updates).toEqual([]);
  });

  it("lista inexistente", async () => {
    updatedRows = [];
    expect(await updateList(idle, fd({ id: LIST, name: "X" }))).toEqual({
      status: "error",
      message: "Lista não encontrada.",
    });
  });
});

describe("applyList — uma chamada ao banco", () => {
  it("aplica pela função do banco e resume o resultado", async () => {
    rpc.mockResolvedValue({ data: { result: "applied", inserted: 2, merged: 1, conflict: 0 }, error: null });
    const res = await applyList(idle, fd({ list_id: LIST }));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("apply_shopping_list", { p_list_id: LIST });
    expect(res).toEqual({ status: "success", message: "2 itens adicionados; 1 já estava na lista (quantidade somada)." });
    expect(revalidatePath).toHaveBeenCalledWith("/compras");
    expect(revalidatePath).toHaveBeenCalledWith("/inicio");
  });

  it.each([
    [{ result: "empty" }, "Lista vazia."],
    [{ result: "not_found" }, "Lista não encontrada."],
  ])("%j → %s", async (data, message) => {
    rpc.mockResolvedValue({ data, error: null });
    expect(await applyList(idle, fd({ list_id: LIST }))).toEqual({ status: "error", message });
  });

  it("sem permissão (42501 no banco) vira a mensagem de permissão", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect(await applyList(idle, fd({ list_id: LIST }))).toEqual({
      status: "error",
      message: "Sem permissão para gerenciar compras.",
    });
  });

  it("id inválido não chega ao banco", async () => {
    expect((await applyList(idle, fd({ list_id: "x" }))).status).toBe("error");
    expect(rpc).not.toHaveBeenCalled();
  });
});
