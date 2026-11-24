import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getShoppingItems } from "@/features/shopping/queries";
import { getCategories } from "@/features/shopping/queries-categories";
import { ShoppingMode } from "@/features/shopping/components/shopping-mode";

export const metadata: Metadata = { title: "Modo Compra" };

export default async function Page() {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  const homeId = profile?.current_home_id ?? null;

  const [items, categories] = await Promise.all([
    homeId ? getShoppingItems(supabase, homeId) : Promise.resolve({ pending: [], purchased: [] }),
    homeId ? getCategories(supabase, homeId) : Promise.resolve([]),
  ]);

  return (
    <>
      {/* Back button */}
      <div style={{ padding: "4px 20px 0", display: "flex", alignItems: "center", gap: 8 }}>
        {/* Área de toque de 44x44 (o visual não muda: o recuo negativo compensa o padding). */}
        <Link
          href="/compras"
          aria-label="Voltar para compras"
          className="-ml-3 inline-flex min-h-11 min-w-11 items-center gap-1 pl-3 pr-4"
          style={{ fontSize: 14, color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={16} />
          Lista
        </Link>
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
          Modo compra
        </span>
      </div>
      <ShoppingMode
        pending={items.pending}
        purchased={items.purchased}
        categories={categories}
      />
    </>
  );
}
