"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/features/shopping/time-ago";

/**
 * Atualiza a lista em tempo real para quem está logado: escuta mudanças em
 * shopping_items da casa (a RLS vale no realtime) e pede ao Next para recarregar
 * os dados do servidor. Agrupa rajadas de eventos (400 ms) para não recarregar
 * a cada linha, e recarrega ao voltar para a aba.
 */
export function ShoppingRealtime({ homeId }: { homeId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let fallback: ReturnType<typeof setInterval> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    void (async () => {
      // O canal precisa do token da pessoa ANTES de assinar; sem isso ele entra
      // como anônimo e a RLS esconde todos os eventos.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`shopping-items-${homeId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shopping_items", filter: `home_id=eq.${homeId}` },
          refresh,
        )
        .subscribe((status) => {
          // Realtime indisponível (ex.: não habilitado no projeto): recarrega por polling.
          if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !fallback) {
            fallback = setInterval(() => {
              if (document.visibilityState === "visible") router.refresh();
            }, 20_000);
          }
        });
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (fallback) clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [homeId, router]);

  return null;
}

/**
 * Para a página pública (visitante sem conta, sem canal realtime): recarrega os
 * dados a cada `seconds` enquanto a aba está visível.
 */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}

/** "há 5 minutos", reavaliado a cada 30 s sem precisar recarregar a página. */
export function UpdatedAgo({ iso }: { iso: string | null }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // O servidor e o navegador calculam em instantes diferentes: ignora a diferença na hidratação.
  return <span suppressHydrationWarning>{timeAgo(iso, now)}</span>;
}
