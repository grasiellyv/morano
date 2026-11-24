"use client";

import { useEffect, useState } from "react";
import { loadProductSources } from "@/features/shopping/actions-suggest";
import type { SuggestionSources } from "@/features/shopping/suggest";

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; promise: Promise<SuggestionSources> } | null = null;

/** Só para testes. */
export function resetProductSourcesCache() {
  cache = null;
}

function fetchOnce(): Promise<SuggestionSources> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.promise;
  const entry = { at: Date.now(), promise: loadProductSources() };
  cache = entry;
  // Falha não fica em cache: a próxima abertura tenta de novo.
  entry.promise.catch(() => {
    if (cache === entry) cache = null;
  });
  return entry.promise;
}

/**
 * Fontes do autocomplete carregadas SOB DEMANDA (quando `enabled`), com cache de 5 min na
 * sessão: abrir vários formulários não repete a ida ao servidor, e as páginas não pagam
 * por isso a cada visita. `undefined` enquanto carrega (o catálogo padrão já sugere).
 */
export function useProductSources(enabled: boolean): SuggestionSources | undefined {
  const [sources, setSources] = useState<SuggestionSources | undefined>();

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchOnce()
      .then((s) => {
        if (alive) setSources(s);
      })
      .catch(() => {
        // sem fontes da casa o catálogo padrão continua funcionando
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return enabled ? sources : undefined;
}
