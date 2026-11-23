import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getShoppingItems } from "@/features/shopping/queries";
import { getCategories } from "@/features/shopping/queries-categories";
import { getShoppingLists, getReorderSuggestions } from "@/features/shopping/queries-lists";
import { ShoppingList } from "@/features/shopping/components/shopping-list";
import { ReorderSuggestions } from "@/features/shopping/components/reorder-suggestions";
import { reorderItem } from "@/features/shopping/actions-lists";
import { PageHeader } from "@/components/feedback/page-header";
import { getLocalDateString } from "@/lib/dates";
import { getHomeWithRooms } from "@/features/homes/queries";

export const metadata: Metadata = { title: "Compras" };

export default async function Page() {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  const homeId = profile?.current_home_id ?? null;

  const home = homeId ? await getHomeWithRooms(userId) : null;
  const today = home ? getLocalDateString(home.timezone) : new Date().toISOString().slice(0, 10);

  const [items, categories, roomsResult, lists, reorderSuggestions] = await Promise.all([
    homeId ? getShoppingItems(supabase, homeId) : Promise.resolve({ pending: [], purchased: [] }),
    homeId ? getCategories(supabase, homeId) : Promise.resolve([]),
    homeId
      ? supabase.from("rooms").select("id, name").eq("home_id", homeId).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    homeId ? getShoppingLists(supabase, homeId) : Promise.resolve([]),
    homeId ? getReorderSuggestions(supabase, homeId, today) : Promise.resolve([]),
  ]);
  const rooms = roomsResult.data ?? [];

  return (
    <>
      <PageHeader
        title="Compras"
        actions={
          <Link href="/configuracoes" aria-label="Configurações" className="flex size-9 items-center justify-center rounded-full border border-border" style={{ background: "var(--card)" }}>
            <SlidersHorizontal aria-hidden size={17} strokeWidth={1.6} />
          </Link>
        }
      />
      <ReorderSuggestions suggestions={reorderSuggestions} reorderAction={reorderItem} />
      <ShoppingList
        pending={items.pending}
        purchased={items.purchased}
        categories={categories}
        rooms={rooms}
        lists={lists}
      />
    </>
  );
}
