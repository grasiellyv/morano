import { describe, expect, it } from "vitest";
import { hrefForType, firstName } from "./display";

describe("hrefForType", () => {
  it("mapeia cada tipo para a rota certa", () => {
    expect(hrefForType("shopping_item_added")).toBe("/compras");
    expect(hrefForType("shopping_item_purchased")).toBe("/compras");
    expect(hrefForType("maintenance_registered")).toBe("/manutencao");
    expect(hrefForType("task_due_today")).toBe("/rotina");
  });
});

describe("firstName", () => {
  it("pega só o primeiro nome", () => {
    expect(firstName("Rafael Viana")).toBe("Rafael");
  });
  it("nome sem sobrenome fica igual", () => {
    expect(firstName("Rafael")).toBe("Rafael");
  });
  it("null vira Alguém", () => {
    expect(firstName(null)).toBe("Alguém");
  });
});
