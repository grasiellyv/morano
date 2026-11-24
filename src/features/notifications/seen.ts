/** Item da central de notificações (serializável: vai do servidor para o cliente). */
export type NotificationItem = {
  key: string;
  href: string;
  title: string;
  meta: string;
  badge: string;
  tone: "warn" | "amber" | "neutral";
};

export function seenStorageKey(homeId: string): string {
  return `morano:notificacoes:vistas:${homeId}`;
}

/** Chaves atuais que não estavam na última abertura da central. */
export function unseenKeys(current: readonly string[], seen: readonly string[]): string[] {
  const known = new Set(seen);
  return current.filter((k) => !known.has(k));
}
