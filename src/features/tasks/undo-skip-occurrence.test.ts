import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const from = vi.fn();
vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "u1", email: "u@x.com" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from }) }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/members/permissions", () => ({ getMemberPermissions: vi.fn() }));

import { skipOccurrence, undoComplete } from "./actions";

const idle = { status: "idle" as const };
const fd = (extra: Record<string, string> = {}) => {
  const f = new FormData();
  f.set("occurrence_id", "o1");
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
};

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
  revalidatePath.mockReset();
});

describe("undoComplete — uma chamada ao banco", () => {
  it("desfaz com UMA ida ao banco (sem consultas avulsas de ocorrência, permissão e fuso)", async () => {
    rpc.mockResolvedValue({ data: { result: "undone", home_id: "h1" }, error: null });
    expect(await undoComplete(idle, fd())).toEqual({ status: "success" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("undo_task_occurrence", { p_occurrence_id: "o1" });
    expect(from).not.toHaveBeenCalled();
  });

  it("sem no_refresh revalida; com no_refresh não relê a página", async () => {
    rpc.mockResolvedValue({ data: { result: "undone", home_id: "h1" }, error: null });
    await undoComplete(idle, fd());
    expect(revalidatePath).toHaveBeenCalledWith("/rotina");
    revalidatePath.mockReset();
    await undoComplete(idle, fd({ no_refresh: "1" }));
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", "Ocorrência não encontrada."],
    ["forbidden", "Sem permissão para desfazer conclusão."],
    ["forbidden_room", "Sem acesso a este cômodo."],
    ["not_completed", "Esta ocorrência não está concluída."],
    ["wrong_day", "Só é possível desfazer no mesmo dia"],
  ])("%s vira a mesma mensagem de antes", async (result, message) => {
    rpc.mockResolvedValue({ data: { result }, error: null });
    expect(await undoComplete(idle, fd())).toEqual({ status: "error", message });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("erro do banco e id vazio", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await undoComplete(idle, fd())).toEqual({ status: "error", message: "Erro ao desfazer. Tente novamente." });
    rpc.mockClear();
    expect(await undoComplete(idle, new FormData())).toEqual({ status: "error", message: "ID inválido." });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("skipOccurrence — uma chamada ao banco", () => {
  it("pula com UMA ida ao banco", async () => {
    rpc.mockResolvedValue({ data: { result: "skipped", home_id: "h1" }, error: null });
    expect(await skipOccurrence(idle, fd())).toEqual({ status: "success" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("skip_task_occurrence", { p_occurrence_id: "o1" });
    expect(from).not.toHaveBeenCalled();
  });

  it("no_refresh evita reler a página", async () => {
    rpc.mockResolvedValue({ data: { result: "skipped", home_id: "h1" }, error: null });
    await skipOccurrence(idle, fd({ no_refresh: "1" }));
    expect(revalidatePath).not.toHaveBeenCalled();
    await skipOccurrence(idle, fd());
    expect(revalidatePath).toHaveBeenCalledWith("/rotina");
  });

  it.each([
    ["not_found", "Ocorrência não encontrada."],
    ["forbidden", "Sem permissão para pular tarefas."],
    ["forbidden_room", "Sem acesso a este cômodo."],
  ])("%s vira a mesma mensagem de antes", async (result, message) => {
    rpc.mockResolvedValue({ data: { result }, error: null });
    expect(await skipOccurrence(idle, fd())).toEqual({ status: "error", message });
  });

  it("erro do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await skipOccurrence(idle, fd())).toEqual({ status: "error", message: "Erro ao pular. Tente novamente." });
  });
});
