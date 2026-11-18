"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { saveComodos } from "@/features/onboarding/actions";
import { initialFormState } from "@/features/auth/form-state";
import { useValidatedSubmit } from "@/features/auth/components/use-validated-submit";
import { FormFeedback, SubmitButton } from "@/features/auth/components/form-parts";
import { RoomSelector } from "./room-selector";
import type { Room } from "@/features/onboarding/room-defaults";

/**
 * Schema client-side: valida apenas que `rooms` é um JSON de array não-vazio.
 * A validação completa dos campos de cada cômodo é feita pelo servidor via comodoSchema.
 */
const comodoClientSchema = z.object({
  rooms: z.string().refine(
    (s) => {
      try {
        const arr = JSON.parse(s) as unknown;
        return Array.isArray(arr) && arr.length > 0;
      } catch {
        return false;
      }
    },
    { message: "Selecione ao menos um cômodo" },
  ),
});

type ComodoClientValues = z.infer<typeof comodoClientSchema>;

export function ComodosForm({ defaultRooms }: { defaultRooms: Room[] }) {
  const [state, formAction, pending] = useActionState(saveComodos, initialFormState);

  const form = useForm<ComodoClientValues>({
    resolver: zodResolver(comodoClientSchema),
    defaultValues: { rooms: JSON.stringify(defaultRooms) },
  });

  const { formRef, onSubmit } = useValidatedSubmit(form, formAction);
  const clientRoomsError = form.formState.errors.rooms?.message;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="space-y-6"
    >
      {/* Cabeçalho com indicador de progresso */}
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm font-medium">Passo 2 de 4</p>
        <h1 className="font-heading text-2xl font-semibold">Seus cômodos</h1>
        <p className="text-muted-foreground text-sm">
          Quais são os cômodos da sua residência?
        </p>
      </div>

      <FormFeedback state={state} />

      {/* RoomSelector gerencia o estado interno e chama onRoomsChange para sincronizar com RHF */}
      <RoomSelector
        defaultRooms={defaultRooms}
        onRoomsChange={(rooms) => {
          void form.setValue("rooms", JSON.stringify(rooms), { shouldValidate: true });
        }}
      />

      {/* Erros de cômodos: client-side ou servidor */}
      {(clientRoomsError ?? state.fieldErrors?.rooms) ? (
        <p className="text-destructive text-sm">
          {clientRoomsError ?? state.fieldErrors?.rooms}
        </p>
      ) : null}

      <SubmitButton pending={pending} pendingLabel="Salvando…">
        Continuar
      </SubmitButton>
    </form>
  );
}
