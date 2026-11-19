import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getShoppingItems } from "@/features/shopping/queries";
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
  const items = homeId ? await getShoppingItems(supabase, homeId) : { pending: [], purchased: [] };
  return (
    <>
      <PageHeader title="Compras" />
      <ShoppingList pending={items.pending} purchased={items.purchased} />
    </>
  );
}
