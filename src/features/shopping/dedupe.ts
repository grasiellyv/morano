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
};

/**
 * Produtos de compras já finalizadas, sem repetição (nome normalizado), do mais
 * recente para o mais antigo. `sessions` deve vir da mais nova para a mais antiga,
 * mas a ordenação não depende disso.
 */
export function historyProducts(
  sessions: ReadonlyArray<{ finished_at: string; items: unknown }>,
  limit = 20,
): HistoryProduct[] {
  const sorted = [...sessions].sort((a, b) => b.finished_at.localeCompare(a.finished_at));
  const seen = new Map<string, HistoryProduct>();
  for (const s of sorted) {
    if (!Array.isArray(s.items)) continue;
    for (const raw of s.items as Array<Record<string, unknown>>) {
      const name = typeof raw?.name === "string" ? raw.name.trim() : "";
      const key = normalizeName(name);
      if (!key || seen.has(key)) continue;
      const qty = Number(raw.quantity);
      seen.set(key, {
        name,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unit: typeof raw.unit === "string" && raw.unit ? raw.unit : "un",
        category_id: typeof raw.category_id === "string" ? raw.category_id : null,
        lastAt: s.finished_at,
      });
      if (seen.size >= limit) return [...seen.values()];
    }
  }
  return [...seen.values()];
}
