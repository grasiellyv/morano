"use client";
import { useActionState, useState } from "react";
import type { TaskRotation } from "@/features/tasks/queries-rotations";
import { setTaskRotation } from "@/features/tasks/actions-rotations";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { ManageRotationsDialog } from "./manage-rotations-dialog";

interface RotationPanelProps {
  taskId: string;
  rotations: TaskRotation[];
  currentRotationId: string | null;
  homeMembers: { id: string; name: string | null }[];
}

const selectClass = "border-input bg-background flex h-9 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RotationPanel({ taskId, rotations, currentRotationId, homeMembers }: RotationPanelProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [state, dispatch, pending] = useActionState(setTaskRotation, initialFormState);

  const currentRotation = rotations.find(r => r.id === currentRotationId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Rodízio</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowDialog(true)}>
          Gerenciar grupos
        </Button>
      </div>

      {currentRotation ? (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm">{currentRotation.name}</span>
          <form action={dispatch}>
            <input type="hidden" name="task_id" value={taskId} />
            <input type="hidden" name="rotation_id" value="" />
            <Button type="submit" variant="ghost" size="sm" disabled={pending}>
              Remover
            </Button>
          </form>
        </div>
      ) : (
        <form action={dispatch} className="flex gap-2">
          <input type="hidden" name="task_id" value={taskId} />
          <select name="rotation_id" className={`${selectClass} flex-1`} defaultValue="">
            <option value="">Sem rodízio</option>
            {rotations.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={pending}>Associar</Button>
        </form>
      )}

      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}

      <ManageRotationsDialog
        rotations={rotations}
        homeMembers={homeMembers}
        open={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </div>
  );
}