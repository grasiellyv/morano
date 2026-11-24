import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, Repeat, ShoppingBasket } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/dates";
import { getRecurringProducts, getRecentShoppingSessions } from "@/features/casa/queries";
import {
  everyMonthsLabel,
  reorderLabel,
  topProducts,
  type ReorderState,
} from "@/features/casa/logic";
import { CategoryIcon } from "@/features/shopping/category-icon";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/features/tasks/rotina-format";

export const metadata: Metadata = { title: "Produtos" };

const STATE_STYLE: Record<ReorderState, React.CSSProperties> = {
  atrasado: { background: "var(--warn-bg)", color: "var(--warn-ink)" },
  em_breve: { background: "#F6DDB9", color: "#6E420F" },
  ok: { background: "var(--secondary)", color: "var(--foreground)" },
};

const card: React.CSSProperties = {
  background: "var(--card)",
  boxShadow: "var(--shadow)",
};

export default async function Page() {
  const user = await requireUser();
  const home = await getHomeWithRooms(user.id);
  if (!home) redirect("/onboarding");

  const supabase = await createClient();
  const today = getLocalDateString(home.timezone);
  const [recurring, sessions] = await Promise.all([
    getRecurringProducts(supabase, home.id, today),
    getRecentShoppingSessions(supabase, home.id),
  ]);
  const frequent = topProducts(sessions);
  const isEmpty = recurring.length === 0 && frequent.length === 0;

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Itens recorrentes"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/casa" className="inline-flex items-center gap-1">
              <ArrowLeft size={16} aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {recurring.length > 0 ? (
          <section aria-labelledby="repor">
            <h2 id="repor" className="mb-2 text-[15px] font-semibold">Reposição programada</h2>
            <ul className="overflow-hidden rounded-[16px] border border-border" style={card}>
              {recurring.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-3.5 py-3"
                  style={{ borderBottom: i < recurring.length - 1 ? "1px solid var(--border)" : undefined }}
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: "var(--secondary)" }}
                  >
                    <CategoryIcon icon={p.category?.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{p.name}</p>
                    <p className="truncate text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                      {everyMonthsLabel(p.reorderMonths)} · {p.listName}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-[8px] px-2 py-[3px] text-[11.5px] font-semibold"
                    style={STATE_STYLE[p.info.state]}
                  >
                    {p.info.state === "ok" ? formatShortDate(p.info.dueDate) : reorderLabel(p.info)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {frequent.length > 0 ? (
          <section aria-labelledby="mais-comprados">
            <h2 id="mais-comprados" className="mb-2 text-[15px] font-semibold">Mais comprados</h2>
            <ul className="overflow-hidden rounded-[16px] border border-border" style={card}>
              {frequent.map((p, i) => (
                <li
                  key={p.name}
                  className="flex items-center gap-3 px-3.5 py-3"
                  style={{ borderBottom: i < frequent.length - 1 ? "1px solid var(--border)" : undefined }}
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: "var(--secondary)" }}
                  >
                    <Repeat size={17} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{p.name}</p>
                    <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                      Última compra em {formatShortDate(p.lastAt.slice(0, 10))}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12.5px] font-semibold">
                    {p.times} {p.times === 1 ? "vez" : "vezes"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isEmpty ? (
          <div
            className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-border px-4 py-8 text-center"
            style={{ background: "var(--card)" }}
          >
            <span className="flex size-11 items-center justify-center rounded-full" style={{ background: "#F6DDB9", color: "#6E420F" }}>
              <ShoppingBasket size={22} aria-hidden />
            </span>
            <p className="text-[15px] font-semibold">Ainda não há itens recorrentes</p>
            <p className="max-w-[280px] text-[13px]" style={{ color: "var(--muted-foreground)" }}>
              Finalize uma compra ou crie uma lista salva com “repor a cada N meses” e eles aparecem aqui.
            </p>
          </div>
        ) : null}

        <Link
          href="/compras"
          className="flex items-center gap-3 rounded-xl border border-border p-3.5 no-underline"
          style={{ ...card, color: "var(--foreground)" }}
        >
          <ShoppingBasket size={18} aria-hidden />
          <span className="flex-1 text-sm font-medium">Gerenciar em Compras</span>
          <ChevronRight size={16} aria-hidden style={{ color: "var(--muted-foreground)" }} />
        </Link>
      </div>
    </>
  );
}
