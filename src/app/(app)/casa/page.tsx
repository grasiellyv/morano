import type { Metadata } from "next";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/feedback/page-header";

export const metadata: Metadata = { title: "Minha casa" };

export default function Page() {
  return (
    <>
      <PageHeader title="Minha casa" />
      <EmptyState
        title="Cômodos e equipamentos aparecem aqui"
        description="Disponível nas Etapas 3 e 5."
      />
    </>
  );
}
