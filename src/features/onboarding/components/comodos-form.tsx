"use client";

import { useActionState } from "react";
import { saveComodos } from "@/features/onboarding/actions";
import { initialFormState } from "@/features/auth/form-state";
import { FormFeedback, SubmitButton } from "@/features/auth/components/form-parts";
import { RoomSelector } from "./room-selector";
import type { Room } from "./room-selector";

export function ComodosForm({ defaultRooms }: { defaultRooms: Room[] }) {
  const [state, formAction, pending] = useActionState(saveComodos, initialFormState);

  return (
    <form action={formAction} className="space-y-6">
      {/* Cabeçalho com indicador de progresso */}
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm font-medium">Passo 2 de 4</p>
        <h1 className="font-heading text-2xl font-semibold">Seus cômodos</h1>
        <p className="text-muted-foreground text-sm">
          Quais são os cômodos da sua residência?
        </p>
      </div>

      <FormFeedback state={state} />

      <RoomSelector defaultRooms={defaultRooms} />

      {state.fieldErrors?.rooms ? (
        <p className="text-destructive text-sm">{state.fieldErrors.rooms}</p>
      ) : null}

      <SubmitButton pending={pending} pendingLabel="Salvando…">
        Continuar
      </SubmitButton>
    </form>
  );
}
