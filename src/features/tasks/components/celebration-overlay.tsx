"use client";

import { useEffect } from "react";

type Props = {
  show: boolean;
  onDismiss: () => void;
};

export function CelebrationOverlay({ show, onDismiss }: Props) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [show, onDismiss]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl p-6 shadow-lg text-center space-y-4">
        <p className="text-xl font-semibold">Rotina completa!</p>
        <p className="text-sm text-muted-foreground">Todas as tarefas do dia foram concluídas.</p>
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
