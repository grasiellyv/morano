import { beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks: Array<() => unknown> = [];
vi.mock("next/server", () => ({ after: (cb: () => unknown) => { afterCallbacks.push(cb); } }));

import { decideMaintenance, runHomeMaintenance } from "./maintenance";

const SP = "America/Sao_Paulo";
const now = new Date("2026-11-24T15:00:00Z"); // 24/11 12:00 em São Paulo

describe("decideMaintenance", () => {
  it("sem resposta da função (migration ausente, erro de rede) cai no comportamento antigo: síncrono", () => {
    expect(decideMaintenance(null, SP, now)).toBe("sync");
  });
  it("outra pessoa/aba já cuidou há pouco: pula", () => {
    expect(decideMaintenance({ claimed: false, previous: "2026-11-24T14:55:00Z" }, SP, now)).toBe("skip");
  });
  it("nunca rodou: síncrono (a tela precisa já nascer certa)", () => {
    expect(decideMaintenance({ claimed: true, previous: null }, SP, now)).toBe("sync");
  });
  it("já rodou hoje (fuso da casa): em segundo plano", () => {
    expect(decideMaintenance({ claimed: true, previous: "2026-11-24T13:00:00Z" }, SP, now)).toBe("background");
  });
  it("última vez foi ontem: síncrono (virada do dia muda atrasadas e rodízio)", () => {
    expect(decideMaintenance({ claimed: true, previous: "2026-11-23T20:00:00Z" }, SP, now)).toBe("sync");
  });
  it("virada de dia usa o fuso da casa, não o UTC", () => {
    // 02:00 UTC do dia 24 ainda é dia 23 em São Paulo
    expect(decideMaintenance({ claimed: true, previous: "2026-11-24T02:00:00Z" }, SP, now)).toBe("sync");
    // em Tóquio, 02:00 UTC do dia 24 é 11:00 do dia 24 e "agora" já é 00:00 do dia 25: outro dia
    expect(decideMaintenance({ claimed: true, previous: "2026-11-24T02:00:00Z" }, "Asia/Tokyo", now)).toBe("sync");
  });
});

function fakeSupabase(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as never;
}

beforeEach(() => {
  afterCallbacks.length = 0;
});

describe("runHomeMaintenance", () => {
  it("pular: não roda nada", async () => {
    const run = vi.fn();
    const rpc = vi.fn().mockResolvedValue({ data: { claimed: false, previous: "2026-11-24T14:55:00Z" }, error: null });
    await runHomeMaintenance({ supabase: fakeSupabase(rpc), homeId: "h1", timezone: SP, run, now });
    expect(run).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(0);
    expect(rpc).toHaveBeenCalledWith("claim_home_maintenance", { p_home_id: "h1" });
  });

  it("síncrono: espera terminar antes de devolver", async () => {
    let done = false;
    const run = vi.fn(async () => { await Promise.resolve(); done = true; });
    const rpc = vi.fn().mockResolvedValue({ data: { claimed: true, previous: null }, error: null });
    await runHomeMaintenance({ supabase: fakeSupabase(rpc), homeId: "h1", timezone: SP, run, now });
    expect(done).toBe(true);
    expect(afterCallbacks).toHaveLength(0);
  });

  it("segundo plano: devolve já, agenda para depois da resposta", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const rpc = vi.fn().mockResolvedValue({ data: { claimed: true, previous: "2026-11-24T13:00:00Z" }, error: null });
    await runHomeMaintenance({ supabase: fakeSupabase(rpc), homeId: "h1", timezone: SP, run, now });
    expect(run).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks[0]!();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("erro na função de claim: roda síncrono como antes da mudança", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    await runHomeMaintenance({ supabase: fakeSupabase(rpc), homeId: "h1", timezone: SP, run, now });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("falha na manutenção nunca derruba a página (síncrono nem em segundo plano)", async () => {
    const run = vi.fn().mockRejectedValue(new Error("boom"));
    const sync = vi.fn().mockResolvedValue({ data: { claimed: true, previous: null }, error: null });
    await expect(runHomeMaintenance({ supabase: fakeSupabase(sync), homeId: "h1", timezone: SP, run, now })).resolves.toBeUndefined();
    const bg = vi.fn().mockResolvedValue({ data: { claimed: true, previous: "2026-11-24T13:00:00Z" }, error: null });
    await runHomeMaintenance({ supabase: fakeSupabase(bg), homeId: "h1", timezone: SP, run, now });
    await expect(afterCallbacks[0]!()).resolves.toBeUndefined();
  });
});
