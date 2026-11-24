import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const run = vi.fn();
vi.mock("@/features/tasks/cron-maintenance", () => ({ runMaintenanceForDueHomes: (...a: unknown[]) => run(...a) }));
const createAdminClient = vi.fn(() => ({ admin: true }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));

import { GET } from "./route";

const req = (headers: Record<string, string> = {}) => new Request("https://morano.app/api/cron/maintenance", { headers });

beforeEach(() => {
  run.mockReset().mockResolvedValue({ due: 3, processed: 3, skipped: 0, failed: 0, stoppedEarly: false });
  createAdminClient.mockClear();
  vi.stubEnv("CRON_SECRET", "segredo-do-cron");
});

describe("GET /api/cron/maintenance", () => {
  it("sem CRON_SECRET configurado a rota fica desligada (503), nunca aberta", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(req({ authorization: "Bearer " }));
    expect(res.status).toBe(503);
    expect(run).not.toHaveBeenCalled();
  });

  it.each([
    [{}],
    [{ authorization: "Bearer errado" }],
    [{ authorization: "segredo-do-cron" }],
    [{ authorization: "Basic segredo-do-cron" }],
    [{ authorization: "Bearer segredo-do-cron-a-mais" }],
  ])("sem o segredo certo é 401 e não toca no banco (%j)", async (headers) => {
    const res = await GET(req(headers));
    expect(res.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("com o segredo certo roda a manutenção e devolve o resumo", async () => {
    const res = await GET(req({ authorization: "Bearer segredo-do-cron" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ due: 3, processed: 3, skipped: 0, failed: 0, stoppedEarly: false });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("falha inesperada vira 500 sem vazar detalhes", async () => {
    run.mockRejectedValue(new Error("senha do banco: abc123"));
    const res = await GET(req({ authorization: "Bearer segredo-do-cron" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("abc123");
  });
});
