import type { Database } from "@/types/database";
import { SHOPPING_CATALOG } from "@/features/shopping/catalog";
import { normalizeName } from "@/features/shopping/dedupe";

export const SUGGEST_MIN_CHARS = 2;
export const SUGGEST_DEBOUNCE_MS = 300;

export type ShoppingUnit = Database["public"]["Enums"]["shopping_unit"];

const UNITS: readonly string[] = ["un", "kg", "g", "l", "ml", "pacote", "caixa"];

export type ProductSuggestion = {
  name: string;
  categoryId: string | null;
  unit: ShoppingUnit | null;
  source: "casa" | "catalogo";
};

/** Produto que a casa já usou (itens das listas, da lista atual e do histórico). */
export type HomeProduct = { name: string; category_id: string | null; unit?: string | null };

export type SuggestionSources = {
  home: HomeProduct[];
  categories: Array<{ id: string; default_slug: string | null }>;
};

function asUnit(u: string | null | undefined): ShoppingUnit | null {
  return u && UNITS.includes(u) ? (u as ShoppingUnit) : null;
}

/**
 * Sugestões para o que a pessoa digita: sem acento/caixa, a partir de 2 caracteres.
 * Ordem: casa começa-com · catálogo começa-com · casa contém · catálogo contém.
 * Cada nome aparece uma vez (a versão da casa vence a do catálogo).
 */
export function suggestProducts(query: string, sources: SuggestionSources, limit = 8): ProductSuggestion[] {
  const q = normalizeName(query);
  if (q.length < SUGGEST_MIN_CHARS) return [];

  const tiers: ProductSuggestion[][] = [[], [], [], []];
  const seen = new Set<string>();

  const consider = (s: ProductSuggestion) => {
    const key = normalizeName(s.name);
    if (seen.has(key)) return;
    const idx = key.indexOf(q);
    if (idx === -1) return;
    seen.add(key);
    const starts = idx === 0;
    tiers[(s.source === "casa" ? 0 : 1) + (starts ? 0 : 2)]!.push(s);
  };

  for (const h of sources.home) {
    consider({ name: h.name, categoryId: h.category_id, unit: asUnit(h.unit), source: "casa" });
  }
  for (const c of SHOPPING_CATALOG) {
    consider({
      name: c.name,
      categoryId: sources.categories.find((cat) => cat.default_slug === c.category_slug)?.id ?? null,
      unit: null,
      source: "catalogo",
    });
  }
  return tiers.flat().slice(0, limit);
}
