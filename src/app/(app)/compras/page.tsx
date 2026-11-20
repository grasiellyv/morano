import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getShoppingItems } from "@/features/shopping/queries";
import { getCategories } from "@/features/shopping/queries-categories";
import { getShoppingLists } from "@/features/shopping/queries-lists";
import { ShoppingList } from "@/features/shopping/components/shopping-list";
import { PageHeader } from "@/components/feedback/page-header";

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

  const [items, categories, roomsResult, lists] = await Promise.all([
    homeId ? getShoppingItems(supabase, homeId) : Promise.resolve({ pending: [], purchased: [] }),
    homeId ? getCategories(supabase, homeId) : Promise.resolve([]),
    homeId
      ? supabase.from("rooms").select("id, name").eq("home_id", homeId).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    homeId ? getShoppingLists(supabase, homeId) : Promise.resolve([]),
  ]);
  const rooms = roomsResult.data ?? [];

  return (
    <>
      <PageHeader title="Compras" />
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
