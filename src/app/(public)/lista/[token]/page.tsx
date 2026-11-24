import type { Metadata } from "next";
import { Check, Eye, LinkIcon, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSharedList, type SharedListItem } from "@/features/shopping/queries";
import { AutoRefresh, UpdatedAgo } from "@/features/shopping/components/live-updates";
import { CategoryIcon } from "@/features/shopping/category-icon";

// Página privada por link: fora dos buscadores e sem vazar o token por referrer.
export const metadata: Metadata = {
  title: "Lista de compras",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Sempre dados frescos: é uma lista viva.
export const dynamic = "force-dynamic";

function groupByCategory(items: SharedListItem[]) {
  const groups = new Map<string, { label: string; icon: string | null; items: SharedListItem[] }>();
  for (const it of items) {
    const key = it.category ?? "__none";
    if (!groups.has(key)) groups.set(key, { label: it.category ?? "Sem categoria", icon: it.category_icon, items: [] });
    groups.get(key)!.items.push(it);
  }
  return [...groups.values()];
}

function ItemLine({ item, done }: { item: SharedListItem; done: boolean }) {
  const who = done ? item.purchased_by && `Comprado por ${item.purchased_by}` : item.added_by && `Adicionado por ${item.added_by}`;
  return (
    <li className="flex items-center gap-3 px-3.5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-full"
        style={
          done
            ? { background: "var(--done-bg)", color: "var(--done-ink)", border: "1.5px solid var(--done-ring)" }
            : { border: "1.5px solid var(--muted-foreground)" }
        }
      >
        {done ? <Check size={14} strokeWidth={2.5} /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[15px] font-medium"
          style={done ? { textDecoration: "line-through", color: "var(--muted-foreground)" } : undefined}
        >
          {item.name}
          <span className="sr-only">{done ? " (comprado)" : " (pendente)"}</span>
        </p>
        {who ? (
          <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{who}</p>
        ) : null}
      </div>
      {item.priority === "urgente" && !done ? (
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-[6px] px-1.5 py-[2px] text-[11px] font-semibold"
          style={{ background: "var(--warn-bg)", color: "var(--warn-ink)" }}
        >
          <TriangleAlert size={12} aria-hidden />
          Urgente
        </span>
      ) : null}
      <span className="shrink-0 text-[13px] font-semibold tabular-nums">
        {item.quantity} {item.unit}
      </span>
    </li>
  );
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const list = await getSharedList(supabase, token);

  if (!list) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-[16px] border border-border px-5 py-10 text-center"
        style={{ background: "var(--card)" }}
      >
        <span className="flex size-11 items-center justify-center rounded-full" style={{ background: "var(--secondary)" }}>
          <LinkIcon size={22} aria-hidden />
        </span>
        <h1 className="text-[17px] font-semibold">Link indisponível</h1>
        <p className="max-w-[300px] text-[13px]" style={{ color: "var(--muted-foreground)" }}>
          Este link foi desativado ou está incorreto. Peça um novo link a quem compartilhou a lista.
        </p>
      </div>
    );
  }

  const pending = list.items.filter((i) => !i.is_purchased);
  const purchased = list.items.filter((i) => i.is_purchased);
  const groups = groupByCategory(pending);

  return (
    <div className="space-y-5">
      <AutoRefresh seconds={20} />

      <header>
        <p className="text-[11.5px] font-medium uppercase tracking-[0.04em]" style={{ color: "var(--muted-foreground)" }}>
          Compras · {list.home_name}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.4px", lineHeight: 1.2 }}>Lista da casa</h1>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px]" style={{ color: "var(--muted-foreground)" }}>
          <Eye size={14} aria-hidden />
          Somente visualização · atualizada <UpdatedAgo iso={list.updated_at} />
        </p>
      </header>

      <div
        className="rounded-[16px] border border-border px-4 py-3.5"
        style={{ background: "var(--card)" }}
      >
        <p className="text-sm font-medium">
          {purchased.length} de {list.items.length} {list.items.length === 1 ? "item" : "itens"}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--secondary)" }}>
          <div
            className="h-full rounded-full"
            style={{
              background: "var(--nav-active)",
              width: list.items.length ? `${Math.round((purchased.length / list.items.length) * 100)}%` : "0%",
            }}
          />
        </div>
      </div>

      {pending.length === 0 && purchased.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          A lista está vazia por enquanto.
        </p>
      ) : null}

      {groups.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
            {g.icon ? <CategoryIcon icon={g.icon} size={15} className="text-muted-foreground" /> : null}
            {g.label}
            <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>
              {g.items.length} {g.items.length === 1 ? "item" : "itens"}
            </span>
          </h2>
          <ul className="overflow-hidden rounded-[16px] border border-border" style={{ background: "var(--card)" }}>
            {g.items.map((it, i) => (
              <ItemLine key={`${it.name}-${i}`} item={it} done={false} />
            ))}
          </ul>
        </section>
      ))}

      {purchased.length > 0 ? (
        <section aria-label="Comprados">
          <h2 className="mb-2 text-[13px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
            Comprados ({purchased.length})
          </h2>
          <ul className="overflow-hidden rounded-[16px] border border-border" style={{ background: "var(--card)" }}>
            {purchased.map((it, i) => (
              <ItemLine key={`${it.name}-${i}`} item={it} done />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
