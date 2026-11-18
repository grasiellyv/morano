import type { Metadata } from "next";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/feedback/page-header";

export const metadata: Metadata = { title: "Início" };

export default function Page() {
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
