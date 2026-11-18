"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";

export function DemoActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <ConfirmDialog
        trigger={<Button variant="outline">Abrir confirmação</Button>}
        title="Confirmar ação?"
        description="Exemplo de diálogo de confirmação."
        confirmLabel="Confirmar"
        onConfirm={() => {
          toast.success("Confirmado");
        }}
      />
      <Button variant="secondary" onClick={() => toast.error("Algo deu errado. Tente novamente.")}>
        Mostrar toast de erro
      </Button>
    </div>
  );
}
