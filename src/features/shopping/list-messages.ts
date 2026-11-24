/** Resumo de "aplicar lista" (itens que entraram, somaram ou foram ignorados por unidade diferente). */
export function applyListMessage(r: { inserted: number; merged: number; conflict: number }): string {
  const parts = [`${r.inserted} ${r.inserted === 1 ? "item adicionado" : "itens adicionados"}`];
  if (r.merged > 0) parts.push(`${r.merged} já ${r.merged === 1 ? "estava" : "estavam"} na lista (quantidade somada)`);
  if (r.conflict > 0) {
    parts.push(`${r.conflict} com unidade diferente ${r.conflict === 1 ? "foi ignorado" : "foram ignorados"}`);
  }
  return `${parts.join("; ")}.`;
}
