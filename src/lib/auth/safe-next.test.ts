import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("aceita caminhos relativos do próprio site", () => {
    expect(safeNextPath("/rotina")).toBe("/rotina");
    expect(safeNextPath("/rotina?x=1")).toBe("/rotina?x=1");
    expect(safeNextPath("/redefinir-senha")).toBe("/redefinir-senha");
  });

  it("recusa URLs absolutas e de protocolo relativo", () => {
    expect(safeNextPath("https://evil.com")).toBe("/inicio");
    expect(safeNextPath("//evil.com")).toBe("/inicio");
    expect(safeNextPath("/\\evil.com")).toBe("/inicio");
    expect(safeNextPath("/rotina?r=https://evil.com")).toBe("/inicio");
    expect(safeNextPath("/\tevil.com")).toBe("/inicio");
  });

  it("recusa rotas de autenticação", () => {
    expect(safeNextPath("/entrar")).toBe("/inicio");
    expect(safeNextPath("/entrar?next=/rotina")).toBe("/inicio");
    expect(safeNextPath("/cadastro/confirme")).toBe("/inicio");
    expect(safeNextPath("/auth/confirm")).toBe("/inicio");
  });

  it("não confunde rotas parecidas com as de autenticação", () => {
    expect(safeNextPath("/entrarx")).toBe("/entrarx");
  });

  it("usa o fallback quando vazio ou inválido", () => {
    expect(safeNextPath(null)).toBe("/inicio");
    expect(safeNextPath(undefined)).toBe("/inicio");
    expect(safeNextPath("")).toBe("/inicio");
    expect(safeNextPath("rotina")).toBe("/inicio");
    expect(safeNextPath("javascript:alert(1)", "/casa")).toBe("/casa");
  });
});
