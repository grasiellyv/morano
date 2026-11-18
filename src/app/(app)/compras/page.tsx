import type { Metadata } from "next";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/feedback/page-header";

export const metadata: Metadata = { title: "Compras" };

export default function Page() {
  return (
    <>
      <PageHeader title="Compras" />
      <EmptyState title="Sua lista de compras aparece aqui" description="Disponível na Etapa 6." />
    </>
  );
}
