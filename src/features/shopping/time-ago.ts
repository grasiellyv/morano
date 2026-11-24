/** "agora", "há 5 minutos", "há 2 horas", "há 3 dias". Pura: `now` é injetado. */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "sem atualizações";
  const diffMs = now.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return "sem atualizações";
  const min = Math.floor(Math.max(0, diffMs) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}
