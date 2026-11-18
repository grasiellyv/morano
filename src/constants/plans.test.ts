import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PLAN_LIMIT_ERRORS, PLAN_LIMITS } from "./plans";

describe("PLAN_LIMITS", () => {
  it("free: 1 casa, 40 tarefas ativas, 5 equipamentos, sem anexos", () => {
    expect(PLAN_LIMITS.free).toEqual({
      maxHomes: 1,
      maxActiveTasks: 40,
      maxAppliances: 5,
      attachmentsAllowed: false,
    });
  });

  it("pro: sem limites e com anexos", () => {
    expect(PLAN_LIMITS.pro).toEqual({
      maxHomes: null,
      maxActiveTasks: null,
      maxAppliances: null,
      attachmentsAllowed: true,
    });
  });
});

describe("PLAN_LIMIT_ERRORS", () => {
  it("tem exatamente as chaves dos erros levantados pelo banco", () => {
    expect(Object.keys(PLAN_LIMIT_ERRORS).sort()).toEqual([
      "plan_limit_appliances",
      "plan_limit_attachments",
      "plan_limit_homes",
      "plan_limit_tasks",
    ]);
  });

  it("cada chave aparece como mensagem de erro na migration", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    const file = readdirSync(dir).find((f) => f.endsWith("_billing_telemetry.sql"));
    expect(file).toBeDefined();
    const sql = readFileSync(join(dir, file as string), "utf8");
    for (const key of Object.keys(PLAN_LIMIT_ERRORS)) {
      expect(sql).toContain(`message = '${key}'`);
    }
  });

  it("mensagens são pt-BR e não vazias", () => {
    for (const msg of Object.values(PLAN_LIMIT_ERRORS)) {
      expect(msg.length).toBeGreaterThan(20);
    }
    expect(PLAN_LIMIT_ERRORS.plan_limit_appliances).toBe(
      "No plano gratuito você pode cadastrar até 5 equipamentos. Arquive um ou conheça o MORANO PRO.",
    );
  });
});
