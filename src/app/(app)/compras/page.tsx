import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getShoppingItems, getShareToken, getShoppingHistorySessions } from "@/features/shopping/queries";
import { getCategories } from "@/features/shopping/queries-categories";
import { getShoppingLists, getReorderSuggestions } from "@/features/shopping/queries-lists";
import { ShoppingList } from "@/features/shopping/components/shopping-list";
import { ShoppingRealtime } from "@/features/shopping/components/live-updates";
import { ReorderSuggestions } from "@/features/shopping/components/reorder-suggestions";
import { reorderItem } from "@/features/shopping/actions-lists";
import { historyProducts } from "@/features/shopping/dedupe";
import { getHomeMembers } from "@/features/members/queries";
import { getMemberPermissions } from "@/features/members/permissions";
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

  const [items, categories, roomsResult, lists, reorderSuggestions, members, shareToken, historySessions, perms] =
    await Promise.all([
      homeId ? getShoppingItems(supabase, homeId) : Promise.resolve({ pending: [], purchased: [] }),
      homeId ? getCategories(supabase, homeId) : Promise.resolve([]),
      homeId
        ? supabase.from("rooms").select("id, name").eq("home_id", homeId).order("position")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      homeId ? getShoppingLists(supabase, homeId) : Promise.resolve([]),
      homeId ? getReorderSuggestions(supabase, homeId, today) : Promise.resolve([]),
      homeId ? getHomeMembers(supabase) : Promise.resolve([]),
      homeId ? getShareToken(supabase, homeId) : Promise.resolve(null), // a RLS só devolve o token a quem gerencia compras
      homeId ? getShoppingHistorySessions(supabase, homeId) : Promise.resolve([]),
      homeId ? getMemberPermissions(supabase, userId, homeId) : Promise.resolve({ bypass: false as const }),
    ]);
  const rooms = roomsResult.data ?? [];

  // Última alteração: o item mexido mais recentemente ou a última compra finalizada.
  const allUpdates = [
    ...items.pending.map((i) => i.updated_at),
    ...items.purchased.map((i) => i.updated_at),
    ...historySessions.map((s) => s.finished_at),
  ];
  const lastUpdatedAt = allUpdates.length > 0 ? allUpdates.reduce((a, b) => (a > b ? a : b)) : null;

  const canShare = !!homeId && (perms.bypass || ("can_manage_shopping" in perms && perms.can_manage_shopping));

  return (
    <>
      {homeId ? <ShoppingRealtime homeId={homeId} /> : null}
      <ReorderSuggestions suggestions={reorderSuggestions} reorderAction={reorderItem} />
      <ShoppingList
        pending={items.pending}
        purchased={items.purchased}
        categories={categories}
        rooms={rooms}
        lists={lists}
        members={members.map((m) => ({ name: m.full_name }))}
        lastUpdatedAt={lastUpdatedAt}
        shareToken={canShare ? shareToken : null}
        canShare={canShare}
        history={historyProducts(historySessions)}
      />
    </>
  );
}
