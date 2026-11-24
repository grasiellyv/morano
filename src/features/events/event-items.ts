import { z } from "zod";
import { normalizeName } from "@/features/shopping/dedupe";
import type { ShoppingUnit } from "@/features/shopping/suggest";
import type { AddItemResult } from "@/features/shopping/add-item";

export const MAX_EVENT_ITEMS = 20;

export type EventItemInput = {
  name: string;
  quantity: number;
  unit: ShoppingUnit;
  category_id: string | null;
};

const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(9999),
  unit: z.enum(["un", "kg", "g", "l", "ml", "pacote", "caixa"]),
  category_id: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal(""))
    .transform((v) => v || null),
});

/** Lê o campo `items` (JSON) do formulário do evento. Vazio = nenhum item. */
export function parseEventItems(
  raw: string | null | undefined,
): { ok: true; items: EventItemInput[] } | { ok: false; message: string } {
  return parseProductItems(raw, { max: MAX_EVENT_ITEMS, noun: "evento" });
}

/** Lista de produtos em JSON (nome, quantidade, unidade, categoria) vinda de um formulário. */
export function parseProductItems(
  raw: string | null | undefined,
  { max, noun }: { max: number; noun: string },
): { ok: true; items: EventItemInput[] } | { ok: false; message: string } {
  if (!raw || !raw.trim()) return { ok: true, items: [] };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Itens inválidos. Tente adicionar de novo." };
  }
  if (!Array.isArray(json)) return { ok: false, message: "Itens inválidos. Tente adicionar de novo." };
  if (json.length > max) return { ok: false, message: `No máximo ${max} itens por ${noun}.` };

  const parsed = z.array(itemSchema).safeParse(json);
  if (!parsed.success) return { ok: false, message: "Itens inválidos. Confira nome, quantidade e unidade." };

  // Repetidos (mesmo nome normalizado e mesma unidade) viram um só, somando a quantidade.
  const merged = new Map<string, EventItemInput>();
  for (const it of parsed.data) {
    const key = `${normalizeName(it.name)}|${it.unit}`;
    const existing = merged.get(key);
    if (existing) existing.quantity = Math.min(Math.round((existing.quantity + it.quantity) * 100) / 100, 9999);
    else merged.set(key, { ...it });
  }
  return { ok: true, items: [...merged.values()] };
}

/** Mensagem final ao salvar o evento: o evento sempre foi salvo; itens problemáticos são listados. */
export function summarizeEventItemResults(
  verb: "criado" | "atualizado",
  results: Array<{ name: string; result: AddItemResult }>,
): string {
  const failed: string[] = [];
  const summed: string[] = [];
  const already: string[] = [];
  for (const { name, result } of results) {
    if (result.result === "error") {
      failed.push(`${name} (${result.forbidden ? "sem permissão para Compras" : "erro ao adicionar"})`);
    } else if (result.result === "conflict") {
      failed.push(`${name} (já está na lista em outra unidade: ${result.quantity} ${result.unit})`);
    } else if (result.result === "merged") {
      summed.push(name);
    } else if (result.result === "unchanged") {
      already.push(name);
    }
  }
  const parts = [`Evento ${verb}.`];
  if (failed.length > 0) parts.push(`Não entraram na lista de compras: ${failed.join("; ")}.`);
  if (summed.length > 0) parts.push(`${summed.join(", ")} já estava na lista: quantidade somada.`);
  if (already.length > 0) parts.push(`${already.join(", ")} já estava na lista deste evento.`);
  return parts.join(" ");
}

/** Item de compras já vinculado a um evento (para listar na edição). */
export type LinkedEventItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  is_purchased: boolean;
};

/** Aviso do diálogo de exclusão do evento; null quando não há itens pendentes. */
export function pendingCountText(n: number): string | null {
  if (n <= 0) return null;
  return n === 1
    ? "O 1 item pendente deste evento sai da lista de compras."
    : `Os ${n} itens pendentes deste evento saem da lista de compras.`;
}
