"use client";

import { useEffect, useRef } from "react";

/**
 * Renderiza um input[type=hidden] com `name="timezone"`.
 * Sem JS, envia o `fallback`. Com JS, detecta o fuso via Intl na montagem.
 */
export function TimezoneDetector({ fallback = "America/Sao_Paulo" }: { fallback?: string }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (ref.current && tz) {
      ref.current.value = tz;
    }
  }, []);

  return <input ref={ref} type="hidden" name="timezone" defaultValue={fallback} />;
}
