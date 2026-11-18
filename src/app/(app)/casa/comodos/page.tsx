import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { RoomList, AddRoomForm } from "@/features/homes/components/room-list";

export const metadata: Metadata = { title: "Cômodos" };

export default async function Page() {
  const user = await requireUser();
  const home = await getHomeWithRooms(user.id);

  if (!home) {
    redirect("/onboarding");
  }

  return (
    <>
      <PageHeader
        title="Cômodos"
        description={`${home.rooms.length} ${home.rooms.length === 1 ? "cômodo" : "cômodos"} em ${home.name}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/casa">← Voltar</Link>
          </Button>
        }
      />

      <RoomList rooms={home.rooms} />

      <AddRoomForm />
    </>
  );
}
