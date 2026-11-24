import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const from = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "u1", email: "u@x.com" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from }) }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/members/permissions", () => ({ getMemberPermissions: vi.fn() }));

import {
  assignOccurrence,
  claimOccurrence,
  postponeOccurrence,
  unclaimOccurrence,
  updateOccurrenceNotes,
} from "./actions";
import { setChecklistItemState } from "./actions-checklist";

const idle = { status: "idle" as const };
const OCC = "00000000-0000-4000-8000-0000000000a1";
const ITEM = "00000000-0000-4000-8000-0000000000b1";
const MEMBER = "00000000-0000-4000-8000-0000000000c1";

function fd(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
  revalidatePath.mockReset();
});

describe("postponeOccurrence — uma chamada ao banco", () => {
  it("adia com UMA ida ao banco", async () => {
    rpc.mockResolvedValue({ data: { result: "postponed" }, error: null });
    expect(await postponeOccurrence(idle, fd({ occurrence_id: OCC, new_date: "2026-12-10" }))).toEqual({ status: "success" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("postpone_task_occurrence", { p_occurrence_id: OCC, p_new_date: "2026-12-10" });
    expect(from).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/rotina");
    expect(revalidatePath).toHaveBeenCalledWith("/inicio");
  });

  it("data mal formada nem chega ao banco", async () => {
    expect(await postponeOccurrence(idle, fd({ occurrence_id: OCC, new_date: "10/12/2026" }))).toEqual({
      status: "error",
      fieldErrors: { new_date: "Data inválida." },
    });
    expect(await postponeOccurrence(idle, fd({ new_date: "2026-12-10" }))).toEqual({ status: "error", message: "ID inválido." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", { status: "error", message: "Ocorrência não encontrada." }],
    ["forbidden", { status: "error", message: "Sem permissão para adiar tarefas." }],
    ["forbidden_room", { status: "error", message: "Sem acesso a este cômodo." }],
    ["not_future", { status: "error", fieldErrors: { new_date: "A nova data deve ser no futuro." } }],
    ["before_original", { status: "error", message: "A nova data deve ser posterior à data original." }],
    [
      "beyond_next",
      {
        status: "error",
        fieldErrors: {
          new_date: "Não é possível adiar para depois da próxima ocorrência — evita duas na mesma data efetiva.",
        },
      },
    ],
  ])("%s vira a mesma mensagem de antes", async (result, expected) => {
    rpc.mockResolvedValue({ data: { result }, error: null });
    expect(await postponeOccurrence(idle, fd({ occurrence_id: OCC, new_date: "2026-12-10" }))).toEqual(expected);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("erro do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await postponeOccurrence(idle, fd({ occurrence_id: OCC, new_date: "2026-12-10" }))).toEqual({
      status: "error",
      message: "Erro ao adiar. Tente novamente.",
    });
  });
});

describe("claimOccurrence / unclaimOccurrence — uma chamada cada", () => {
  it("assume", async () => {
    rpc.mockResolvedValue({ data: { result: "claimed" }, error: null });
    expect(await claimOccurrence(idle, fd({ occurrence_id: OCC }))).toEqual({ status: "success", message: "" });
    expect(rpc).toHaveBeenCalledWith("claim_task_occurrence", { p_occurrence_id: OCC });
    expect(from).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/rotina");
  });

  it.each([
    ["not_found", "Ocorrência não encontrada."],
    ["not_pending", "Ocorrência não está pendente."],
    ["already_assigned", "Já atribuída a outro membro."],
  ])("assumir: %s → %s", async (result, message) => {
    rpc.mockResolvedValue({ data: { result }, error: null });
    expect(await claimOccurrence(idle, fd({ occurrence_id: OCC }))).toEqual({ status: "error", message });
  });

  it("libera", async () => {
    rpc.mockResolvedValue({ data: { result: "released" }, error: null });
    expect(await unclaimOccurrence(idle, fd({ occurrence_id: OCC }))).toEqual({ status: "success", message: "" });
    expect(rpc).toHaveBeenCalledWith("unclaim_task_occurrence", { p_occurrence_id: OCC });
  });

  it.each([
    ["not_found", "Ocorrência não encontrada."],
    ["not_yours", "Esta tarefa não está atribuída a você."],
  ])("liberar: %s → %s", async (result, message) => {
    rpc.mockResolvedValue({ data: { result }, error: null });
    expect(await unclaimOccurrence(idle, fd({ occurrence_id: OCC }))).toEqual({ status: "error", message });
  });

  it("erros do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await claimOccurrence(idle, fd({ occurrence_id: OCC }))).toEqual({ status: "error", message: "Erro ao atribuir tarefa. Tente novamente." });
    expect(await unclaimOccurrence(idle, fd({ occurrence_id: OCC }))).toEqual({ status: "error", message: "Erro ao liberar tarefa. Tente novamente." });
  });
});

describe("updateOccurrenceNotes — uma chamada ao banco", () => {
  it("salva a nota", async () => {
    rpc.mockResolvedValue({ data: { result: "saved" }, error: null });
    expect(await updateOccurrenceNotes(idle, fd({ occurrence_id: OCC, notes: "  Faltou sabão  " }))).toEqual({
      status: "success",
      message: "Nota salva.",
    });
    expect(rpc).toHaveBeenCalledWith("update_occurrence_notes", { p_occurrence_id: OCC, p_notes: "Faltou sabão" });
    expect(from).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/rotina/historico");
  });

  it("nota em branco manda nulo (apaga)", async () => {
    rpc.mockResolvedValue({ data: { result: "saved" }, error: null });
    await updateOccurrenceNotes(idle, fd({ occurrence_id: OCC, notes: "   " }));
    expect(rpc).toHaveBeenCalledWith("update_occurrence_notes", { p_occurrence_id: OCC, p_notes: null });
  });

  it("nota longa demais nem chega ao banco", async () => {
    expect(await updateOccurrenceNotes(idle, fd({ occurrence_id: OCC, notes: "a".repeat(2001) }))).toEqual({
      status: "error",
      message: "Nota muito longa (máx. 2000 caracteres).",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", "Ocorrência não encontrada."],
    ["forbidden", "Sem permissão."],
    ["forbidden_room", "Sem acesso a este cômodo."],
    ["too_long", "Nota muito longa (máx. 2000 caracteres)."],
  ])("%s → %s", async (result, message) => {
    rpc.mockResolvedValue({ data: { result }, error: null });
    expect(await updateOccurrenceNotes(idle, fd({ occurrence_id: OCC, notes: "oi" }))).toEqual({ status: "error", message });
  });
});

describe("assignOccurrence — uma chamada ao banco", () => {
  it("atribui a um morador", async () => {
    rpc.mockResolvedValue({ data: { result: "assigned" }, error: null });
    expect(await assignOccurrence(idle, fd({ occurrence_id: OCC, assigned_to: MEMBER }))).toEqual({ status: "success", message: "" });
    expect(rpc).toHaveBeenCalledWith("assign_task_occurrence", { p_occurrence_id: OCC, p_assigned_to: MEMBER });
    expect(from).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/inicio");
  });

  it("vazio = compartilhada (nulo)", async () => {
    rpc.mockResolvedValue({ data: { result: "assigned" }, error: null });
    await assignOccurrence(idle, fd({ occurrence_id: OCC, assigned_to: "" }));
    expect(rpc).toHaveBeenCalledWith("assign_task_occurrence", { p_occurrence_id: OCC, p_assigned_to: null });
  });

  it("sem mudança é sucesso e não relê as telas", async () => {
    rpc.mockResolvedValue({ data: { result: "unchanged" }, error: null });
    expect(await assignOccurrence(idle, fd({ occurrence_id: OCC, assigned_to: MEMBER }))).toEqual({ status: "success", message: "" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("id de morador que não é uuid vira 'não encontrado' sem ir ao banco", async () => {
    expect(await assignOccurrence(idle, fd({ occurrence_id: OCC, assigned_to: "não-é-uuid" }))).toEqual({
      status: "error",
      message: "Morador não encontrado nesta casa.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", "Ocorrência não encontrada."],
    ["not_pending", "Só dá para trocar o responsável de uma tarefa pendente."],
    ["forbidden", "Sem permissão para atribuir tarefas a outros moradores."],
    ["member_not_found", "Morador não encontrado nesta casa."],
  ])("%s → %s", async (result, message) => {
    rpc.mockResolvedValue({ data: { result }, error: null });
    expect(await assignOccurrence(idle, fd({ occurrence_id: OCC, assigned_to: MEMBER }))).toEqual({ status: "error", message });
  });

  it("erro do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await assignOccurrence(idle, fd({ occurrence_id: OCC, assigned_to: MEMBER }))).toEqual({
      status: "error",
      message: "Erro ao trocar o responsável. Tente novamente.",
    });
  });
});

describe("setChecklistItemState — uma chamada ao banco", () => {
  it.each([["done"], ["skipped"], ["clear"]])("%s com UMA ida ao banco", async (status) => {
    rpc.mockResolvedValue({ data: { result: status === "clear" ? "cleared" : "set" }, error: null });
    expect(await setChecklistItemState(idle, fd({ occurrence_id: OCC, item_id: ITEM, status }))).toEqual({ status: "success" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("set_checklist_item_state", { p_occurrence_id: OCC, p_item_id: ITEM, p_status: status });
    expect(from).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/rotina");
  });

  it("dados inválidos não chegam ao banco", async () => {
    expect(await setChecklistItemState(idle, fd({ occurrence_id: "x", item_id: ITEM, status: "done" }))).toEqual({
      status: "error",
      message: "Dados inválidos.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([["not_found"], ["item_not_found"]])("%s vira mensagem de erro", async (result) => {
    rpc.mockResolvedValue({ data: { result }, error: null });
    expect(await setChecklistItemState(idle, fd({ occurrence_id: OCC, item_id: ITEM, status: "done" }))).toEqual({
      status: "error",
      message: "Não foi possível atualizar o item.",
    });
  });

  it("erro do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await setChecklistItemState(idle, fd({ occurrence_id: OCC, item_id: ITEM, status: "done" }))).toEqual({
      status: "error",
      message: "Não foi possível atualizar o item.",
    });
  });
});
