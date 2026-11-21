import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <h2 className="text-lg font-semibold">Tarefa não encontrada</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Esta tarefa não existe ou foi removida.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/rotina">Voltar para rotina</Link>
      </Button>
    </div>
  );
}
