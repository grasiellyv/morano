import type { Metadata } from "next";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/feedback/page-header";

export const metadata: Metadata = { title: "Rotina" };

export default function Page() {
  return (
    <>
      <PageHeader title="Rotina" />
      <EmptyState
        title="Suas tarefas e rotinas aparecem aqui"
        description="Disponível na Etapa 4."
      />
    </>
  );
}
