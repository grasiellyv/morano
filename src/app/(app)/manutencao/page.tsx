import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getMaintenanceItems } from "@/features/manutencao/queries";
import { MaintenanceList } from "@/features/manutencao/components/maintenance-list";
import { PageHeader } from "@/components/feedback/page-header";

export const metadata: Metadata = { title: "Manutenção" };

export default async function Page() {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();
  const homeId = profile?.current_home_id ?? null;
  const [items, roomsResult] = homeId
    ? await Promise.all([
        getMaintenanceItems(supabase, homeId),
        supabase.from("rooms").select("id, name").eq("home_id", homeId),
      ])
    : [[], { data: [] }];
  const rooms = (roomsResult as { data: Array<{ id: string; name: string }> | null }).data ?? [];

  return (
    <>
      <PageHeader
        title="Manutenção"
      />
      <MaintenanceList items={items} rooms={rooms} />
    </>
  );
}
