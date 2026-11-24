"use client";

import { useEffect, useRef } from "react";

/**
 * Seção recolhível com <details> nativo (teclado e leitor de tela de graça).
 * Lembra aberto/fechado por `storageKey` no localStorage. A preferência é
 * aplicada direto no DOM depois da montagem, sem setState (evita hydration mismatch).
 * `forceOpen` abre a seção mesmo com preferência salva "fechado" (ex.: link com ?secao=).
 */
export function CollapsibleSection({
  id,
  storageKey,
  defaultOpen,
  title,
  meta,
  icon,
  tone,
  card = false,
  muted = false,
  forceOpen = false,
  children,
}: {
  id?: string;
  storageKey: string;
  defaultOpen: boolean;
  title: string;
  meta?: string;
  icon?: React.ReactNode;
  tone?: "warn";
  card?: boolean;
  muted?: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (forceOpen) {
      ref.current.open = true;
      return;
    }
    try {
      const v = window.localStorage.getItem(storageKey);
      if (v !== null) ref.current.open = v === "1";
    } catch {
      // localStorage indisponível (modo privado): fica o padrão
    }
  }, [storageKey, forceOpen]);

  const color = tone === "warn" ? "var(--warn-ink)" : "var(--foreground)";

  return (
    <details
      id={id}
      ref={ref}
      open={defaultOpen || forceOpen}
      onToggle={(e) => {
        try {
          window.localStorage.setItem(storageKey, (e.currentTarget as HTMLDetailsElement).open ? "1" : "0");
        } catch {
          // ignora
        }
      }}
      className={`group ${card ? "rounded-2xl border border-border" : ""}`}
      style={{ background: card ? "var(--card)" : undefined, opacity: muted ? 0.7 : 1 }}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-2xl select-none focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
        style={{ minHeight: 44, padding: card ? "0 16px" : "0 2px", color }}
      >
        {icon ? (
          <span style={{ display: "flex", color: tone === "warn" ? "var(--warn-ink)" : "var(--muted-foreground)" }}>{icon}</span>
        ) : null}
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
        {meta ? (
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--muted-foreground)" }}>{meta}</span>
        ) : null}
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="ml-auto transition-transform duration-200 group-open:rotate-180"
          style={{ color: "var(--muted-foreground)", flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      {children}
    </details>
  );
}
