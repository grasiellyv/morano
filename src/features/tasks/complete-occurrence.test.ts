import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const from = vi.fn();
vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "u1", email: "u@x.com" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from }) }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
const afterCbs: Array<() => unknown> = [];
vi.mock("next/server", () => ({ after: (cb: () => unknown) => { afterCbs.push(cb); } }));
const trackEvent = vi.fn();
vi.mock("@/lib/telemetry", () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }));
vi.mock("@/features/members/permissions", () => ({ getMemberPermissions: vi.fn() }));

import { completeOccurrence } from "./actions";

const fd = (extra: Record<string, string> = {}) => {
  const f = new FormData();
  f.set("occurrence_id", "o1");
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
};
const idle = { status: "idle" as const };

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
  revalidatePath.mockReset();
  trackEvent.mockReset();
  afterCbs.length = 0;
});

describe("completeOccurrence — uma chamada ao banco", () => {
  it("conclui com UMA ida ao banco (nada de consultas avulsas de ocorrência/permissão)", async () => {
    rpc.mockResolvedValue({ data: { result: "completed", home_id: "h1" }, error: null });
    const res = await completeOccurrence(idle, fd());
    expect(res).toEqual({ status: "success" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("complete_task_occurrence", { p_occurrence_id: "o1" });
    expect(from).not.toHaveBeenCalled();
  });

  it("telemetria vai para depois da resposta, com a casa devolvida pelo banco", async () => {
    rpc.mockResolvedValue({ data: { result: "completed", home_id: "h1" }, error: null });
    await completeOccurrence(idle, fd());
    expect(trackEvent).not.toHaveBeenCalled();
    await afterCbs[0]!();
    expect(trackEvent).toHaveBeenCalledWith("u1", "h1", "occurrence_completed");
  });

  it("sem no_refresh revalida as telas; com no_refresh não relê a página", async () => {
    rpc.mockResolvedValue({ data: { result: "completed", home_id: "h1" }, error: null });
    await completeOccurrence(idle, fd());
    expect(revalidatePath).toHaveBeenCalledWith("/rotina");
    expect(revalidatePath).toHaveBeenCalledWith("/inicio");
    revalidatePath.mockReset();
    await completeOccurrence(idle, fd({ no_refresh: "1" }));
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", "Ocorrência não encontrada."],
    ["forbidden", "Sem permissão para concluir tarefas."],
    ["forbidden_room", "Sem acesso a este cômodo."],
  ])("%s vira a mesma mensagem de antes", async (result, message) => {
    rpc.mockResolvedValue({ data: { result }, error: null });
    expect(await completeOccurrence(idle, fd())).toEqual({ status: "error", message });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(afterCbs).toHaveLength(0);
  });

  it("erro do banco vira mensagem genérica; id vazio é recusado sem ir ao banco", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await completeOccurrence(idle, fd())).toEqual({ status: "error", message: "Erro ao concluir. Tente novamente." });
    rpc.mockClear();
    const empty = new FormData();
    expect(await completeOccurrence(idle, empty)).toEqual({ status: "error", message: "ID inválido." });
    expect(rpc).not.toHaveBeenCalled();
  });
});
