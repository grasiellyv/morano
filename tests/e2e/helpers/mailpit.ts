const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type Summary = { ID: string };

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x3D;/gi, "=")
    .replace(/&#43;/g, "+");
}

/**
 * Espera até 10 s pelo e-mail mais novo enviado a `email` e devolve o primeiro
 * link `http://localhost…` dele.
 */
export async function latestLinkFor(email: string): Promise<string> {
  const deadline = Date.now() + 10_000;
  let lastError = "nenhuma mensagem encontrada";
  while (Date.now() < deadline) {
    try {
      const search = await fetch(
        `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`,
      );
      if (search.ok) {
        const { messages } = (await search.json()) as { messages?: Summary[] };
        const newest = messages?.[0];
        if (newest) {
          const res = await fetch(`${MAILPIT_URL}/api/v1/message/${newest.ID}`);
          const message = (await res.json()) as { HTML?: string; Text?: string };
          const source = `${message.HTML ?? ""}\n${message.Text ?? ""}`;
          const match = /(?:href=")?(http:\/\/localhost[^"\s<>]+)/.exec(source);
          if (match?.[1]) return decodeHtml(match[1]);
          lastError = "mensagem sem link";
        }
      } else {
        lastError = `Mailpit respondeu ${search.status}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(
    `Nenhum e-mail para ${email} em 10 s (${lastError}). O Supabase local está rodando (npm run db:start)?`,
  );
}

/** O link do e-mail aponta para NEXT_PUBLIC_SITE_URL; o teste abre o mesmo caminho no servidor de teste. */
export function pathOf(link: string) {
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
}
