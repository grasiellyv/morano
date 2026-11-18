import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Registra um evento de produto no banco de dados.
 * Nunca lança exceção — erros de telemetria não devem interromper fluxos principais.
 */
export async function trackEvent(
  userId: string,
  homeId: string | null,
  eventName: string,
): Promise<void> {
  if (!homeId) return;
  if (!/^[a-z_]{3,50}$/.test(eventName)) return;

  try {
    const supabase = await createClient();
    await supabase.from("product_events").insert({
      user_id: userId,
      home_id: homeId,
      event_name: eventName,
    });
  } catch {
    // Telemetria não deve quebrar fluxos principais — erro silenciado intencionalmente
  }
}
