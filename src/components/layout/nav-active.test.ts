import { describe, expect, it } from "vitest";
import { PRIMARY_NAV, SETTINGS_NAV } from "./nav-items";
import { isNavItemActive } from "./nav-active";

describe("navegação principal", () => {
  it("expõe exatamente os 5 itens, na ordem definida", () => {
    expect(PRIMARY_NAV.map((i) => i.label)).toEqual([
      "Início",
      "Rotina",
      "Compras",
      "Manutenção",
      "Casa",
    ]);
    expect(PRIMARY_NAV.map((i) => i.href)).toEqual([
      "/inicio",
      "/rotina",
      "/compras",
      "/manutencao",
      "/casa",
    ]);
  });

  it("cada item tem um ícone definido", () => {
    for (const item of PRIMARY_NAV) {
      expect(item.icon).toBeDefined();
    }
  });

  it("configurações aponta para /configuracoes", () => {
    expect(SETTINGS_NAV.href).toBe("/configuracoes");
    expect(SETTINGS_NAV.label).toBe("Configurações");
    expect(SETTINGS_NAV.icon).toBeDefined();
  });
});

describe("isNavItemActive", () => {
  it("considera ativo na igualdade exata", () => {
    expect(isNavItemActive("/rotina", "/rotina")).toBe(true);
  });

  it("considera ativo em subrotas", () => {
    expect(isNavItemActive("/rotina/calendario", "/rotina")).toBe(true);
  });

  it("não confunde prefixos de texto com subrotas", () => {
    expect(isNavItemActive("/rotina-antiga", "/rotina")).toBe(false);
  });

  it("raiz não ativa o início", () => {
    expect(isNavItemActive("/", "/inicio")).toBe(false);
  });

  it("ignora barra final", () => {
    expect(isNavItemActive("/inicio/", "/inicio")).toBe(true);
  });

  it("ignora query string", () => {
    expect(isNavItemActive("/compras?x=1", "/compras")).toBe(true);
  });

  it("ignora hash", () => {
    expect(isNavItemActive("/compras#lista", "/compras")).toBe(true);
  });

  it("não ativa item diferente", () => {
    expect(isNavItemActive("/casa", "/rotina")).toBe(false);
  });
});
