import type { Metadata } from "next";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/feedback/page-header";

export const metadata: Metadata = { title: "Manutenção" };

export default function Page() {
  return (
    <>
      <PageHeader title="Manutenção" />
      <EmptyState title="Serviços e problemas aparecem aqui" description="Disponível na Etapa 5." />
    </>
  );
}
