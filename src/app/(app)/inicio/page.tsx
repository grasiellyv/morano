import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/feedback/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { extendWindowForHome } from "@/features/tasks/actions";

export const metadata: Metadata = { title: "Início" };

export default async function Page() {
  const { id: userId } = await requireUser();
  const home = await getHomeWithRooms(userId);

  if (!home) {
    redirect("/onboarding");
  }

  await extendWindowForHome(home.id, home.timezone).catch(() => {});

  return (
    <>
      <PageHeader title="Início" />
      <EmptyState
        title="O resumo da sua casa aparece aqui"
        description="Disponível na Etapa 7, depois que rotina, casa, manutenção e compras estiverem prontas."
      />
    </>
  );
}
