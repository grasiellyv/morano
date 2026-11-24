"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Bell, CalendarClock, ShoppingBag, Wrench, X, type LucideIcon } from "lucide-react";
import { seenStorageKey, unseenKeys, type NotificationItem } from "./seen";

const TONE_STYLE: Record<NotificationItem["tone"], React.CSSProperties> = {
  warn: { background: "var(--warn-bg)", color: "var(--warn-ink)" },
  amber: { background: "#F6DDB9", color: "#6E420F" },
  neutral: { background: "var(--secondary)", color: "var(--foreground)" },
};

/** Ícone pelo prefixo da chave: t- tarefa, s-/r- compras, m- manutenção. */
function iconFor(key: string): LucideIcon {
  if (key.startsWith("t-")) return CalendarClock;
  if (key.startsWith("m-")) return Wrench;
  return ShoppingBag;
}

function parseSeen(raw: string | null): string[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

// localStorage como fonte externa: no servidor o snapshot é `undefined` ("ainda não lido"),
// o que evita divergência de hidratação e mantém o ponto escondido até montar.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readRaw(homeId: string): string | null {
  try {
    return localStorage.getItem(seenStorageKey(homeId));
  } catch {
    return null;
  }
}
function writeSeen(homeId: string, keys: string[]) {
  try {
    localStorage.setItem(seenStorageKey(homeId), JSON.stringify(keys));
  } catch {
    // armazenamento indisponível: o ponto volta ao recarregar
  }
  listeners.forEach((l) => l());
}

export function NotificationBell({ homeId, items }: { homeId: string; items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(homeId),
    () => undefined,
  );

  const keys = items.map((i) => i.key);
  const unseen = raw === undefined ? 0 : unseenKeys(keys, parseSeen(raw)).length;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) writeSeen(homeId, keys);
  }

  const label = unseen > 0 ? `Notificações, ${unseen} ${unseen === 1 ? "nova" : "novas"}` : "Notificações";

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className="relative flex size-10 items-center justify-center rounded-full border border-border"
          style={{ background: "var(--card)" }}
        >
          <Bell aria-hidden size={19} strokeWidth={1.75} />
          {unseen > 0 ? (
            <span
              aria-hidden
              className="absolute rounded-full border-2"
              style={{ top: 9, right: 10, width: 8, height: 8, background: "#C8643C", borderColor: "var(--card)" }}
            />
          ) : null}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-[20px] border border-border bg-card p-4 shadow-lg outline-none md:inset-x-auto md:bottom-auto md:right-6 md:top-16 md:w-[360px] md:rounded-[20px]"
        >
          <div className="mb-2 flex items-center gap-2">
            <Dialog.Title className="flex-1 text-[16px] font-semibold">Notificações</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar notificações"
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X size={18} strokeWidth={1.75} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Itens da casa que pedem atenção.</Dialog.Description>

          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nada pedindo atenção agora.</p>
          ) : (
            <ul>
              {items.map((item, i) => {
                const Icon = iconFor(item.key);
                return (
                  <li key={item.key} style={{ borderBottom: i === items.length - 1 ? undefined : "1px solid var(--border)" }}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-[60px] items-center gap-3 no-underline"
                      style={{ color: "var(--foreground)" }}
                    >
                      <span
                        aria-hidden
                        className="flex shrink-0 items-center justify-center rounded-[10px]"
                        style={{ width: 34, height: 34, ...TONE_STYLE[item.tone] }}
                      >
                        <Icon size={17} strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1 py-2.5">
                        <span className="block truncate text-[14px] font-medium">{item.title}</span>
                        <span className="block truncate text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                          {item.meta}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-[8px] px-2 py-[3px] text-[11.5px] font-semibold" style={TONE_STYLE[item.tone]}>
                        {item.badge}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
