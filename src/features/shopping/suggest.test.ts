import { describe, expect, it } from "vitest";
import { suggestProducts, SUGGEST_MIN_CHARS, SUGGEST_DEBOUNCE_MS } from "./suggest";

const categories = [{ id: "cat-ali", default_slug: "alimentacao" }];
const home = [{ name: "Leite", category_id: "cat-ali", unit: "l" }];

describe("suggestProducts", () => {
  it("constantes da spec", () => {
    expect(SUGGEST_MIN_CHARS).toBe(2);
    expect(SUGGEST_DEBOUNCE_MS).toBe(300);
  });

  it("precisa de 2 caracteres", () => {
    expect(suggestProducts("l", { home, categories })).toEqual([]);
    expect(suggestProducts(" l ", { home, categories })).toEqual([]);
  });

  it("ignora acento e caixa", () => {
    expect(suggestProducts("ACU", { home: [], categories }).map((s) => s.name)).toContain("Açúcar");
    expect(suggestProducts("acucar", { home: [], categories }).map((s) => s.name)).toContain("Açúcar");
    expect(suggestProducts("LEI", { home: [], categories }).map((s) => s.name)).toContain("Leite");
  });

  it("item da casa vem primeiro, com unidade e categoria", () => {
    const [first] = suggestProducts("lei", { home, categories });
    expect(first).toEqual({ name: "Leite", categoryId: "cat-ali", unit: "l", source: "casa" });
  });

  it("item do catálogo traz a categoria pelo slug e unidade nula", () => {
    const hit = suggestProducts("arroz", { home: [], categories }).find((s) => s.name === "Arroz");
    expect(hit).toEqual({ name: "Arroz", categoryId: "cat-ali", unit: null, source: "catalogo" });
  });

  it("não repete nome que já veio da casa", () => {
    expect(suggestProducts("leite", { home, categories }).filter((s) => s.name === "Leite")).toHaveLength(1);
  });

  it("não repete nomes dentro da própria casa (acento/caixa)", () => {
    const dup = [
      { name: "Açúcar", category_id: null, unit: "kg" },
      { name: "acucar", category_id: null, unit: "kg" },
    ];
    expect(suggestProducts("acu", { home: dup, categories }).filter((s) => s.source === "casa")).toHaveLength(1);
  });

  it("começa-com antes de contém", () => {
    const names = suggestProducts("leite", { home: [], categories }).map((s) => s.name);
    expect(names.indexOf("Leite")).toBeLessThan(names.indexOf("Creme de leite"));
  });

  it("unidade inválida vira null", () => {
    const [s] = suggestProducts("xa", { home: [{ name: "Xampu", category_id: null, unit: "frasco" }], categories });
    expect(s!.unit).toBeNull();
  });

  it("respeita o limite", () => {
    expect(suggestProducts("a", { home: [], categories })).toEqual([]);
    expect(suggestProducts("ar", { home: [], categories }, 3).length).toBeLessThanOrEqual(3);
  });
});
