/** Lógica pura (sem banco) para evitar duplicações e recuperar itens do histórico. */

/** "  Açúcar  Refinado " → "acucar refinado" (sem acento, caixa ou espaços extras). */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Primeiro item pendente com o mesmo nome (comparação normalizada). */
export function findDuplicate<T extends { name: string }>(existing: readonly T[], name: string): T | null {
  const key = normalizeName(name);
  if (!key) return null;
  return existing.find((e) => normalizeName(e.name) === key) ?? null;
}

export type HistoryProduct = {
  name: string;
  quantity: number;
  unit: string;
  category_id: string | null;
  lastAt: string;
  /** Em quantas compras finalizadas o produto apareceu (quanto mais, mais "pedido"). */
  times: number;
};

/**
 * Produtos de compras já finalizadas, sem repetição (nome normalizado). Os MAIS PEDIDOS primeiro
 * (em mais compras), e entre iguais o de compra mais recente. Quantidade, unidade e categoria vêm
 * da compra mais recente do produto. O limite corta depois de ordenar.
 */
export function historyProducts(
  sessions: ReadonlyArray<{ finished_at: string; items: unknown }>,
  limit = 20,
): HistoryProduct[] {
  const sorted = [...sessions].sort((a, b) => b.finished_at.localeCompare(a.finished_at));
  const seen = new Map<string, HistoryProduct>();
  for (const s of sorted) {
    if (!Array.isArray(s.items)) continue;
    const inThisSession = new Set<string>();
    for (const raw of s.items as Array<Record<string, unknown>>) {
      const name = typeof raw?.name === "string" ? raw.name.trim() : "";
      const key = normalizeName(name);
      if (!key || inThisSession.has(key)) continue;
      inThisSession.add(key);
      const existing = seen.get(key);
      if (existing) {
        existing.times += 1; // sessões vêm da mais nova para a mais antiga: os dados já são os mais recentes
        continue;
      }
      const qty = Number(raw.quantity);
      seen.set(key, {
        name,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unit: typeof raw.unit === "string" && raw.unit ? raw.unit : "un",
        category_id: typeof raw.category_id === "string" ? raw.category_id : null,
        lastAt: s.finished_at,
        times: 1,
      });
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.times - a.times || b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit);
}
