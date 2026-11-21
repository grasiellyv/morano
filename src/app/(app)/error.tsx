"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <h2 className="text-lg font-semibold">Algo deu errado</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Ocorreu um erro inesperado. Você pode tentar novamente ou voltar para o início.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default" size="sm">
          Tentar novamente
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/inicio">Ir para início</a>
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60">ID: {error.digest}</p>
      )}
    </div>
  );
}
