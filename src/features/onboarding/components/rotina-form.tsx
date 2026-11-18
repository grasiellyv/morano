"use client";

import { useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { saveRotina } from "@/features/onboarding/actions";
import { ROUTINE_LEVELS, type RoutineLevel } from "@/features/onboarding/catalog";
import { initialFormState } from "@/features/auth/form-state";
import { useValidatedSubmit } from "@/features/auth/components/use-validated-submit";
import { FormFeedback, SubmitButton } from "@/features/auth/components/form-parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Client schema: available_minutes_per_week sem coerce (RHF lê valueAsNumber)
const clientSchema = z.object({
  routine_level: z.enum(ROUTINE_LEVELS),
  available_minutes_per_week: z
    .number({ error: "Informe os minutos disponíveis por semana" })
    .int("Deve ser um número inteiro")
    .min(10, "Mínimo 10 minutos")
    .max(2000, "Máximo 2000 minutos"),
});

type ClientFormValues = z.infer<typeof clientSchema>;

function FieldError({ msg }: { msg: string | undefined }) {
  if (!msg) return null;
  return <p className="text-destructive text-sm">{msg}</p>;
}

const LEVEL_CARDS: Array<{
  value: RoutineLevel;
  label: string;
  description: string;
}> = [
  {
    value: "leve",
    label: "Leve",
    description: "Tarefas essenciais, sem pressão",
  },
  {
    value: "equilibrada",
    label: "Equilibrada",
    description: "Cobertura completa no tempo que você tem",
  },
  {
    value: "detalhada",
    label: "Detalhada",
    description: "Máximo cuidado com cada ambiente",
  },
];

export function RotinaForm() {
  const [state, formAction, pending] = useActionState(saveRotina, initialFormState);

  const [selectedLevel, setSelectedLevel] = useState<RoutineLevel>("equilibrada");

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      routine_level: "equilibrada",
      available_minutes_per_week: 120,
    },
  });

  const { formRef, onSubmit } = useValidatedSubmit(form, formAction);
  const errors = form.formState.errors;
  const serverErrors = state.fieldErrors;

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
        <p className="text-muted-foreground text-sm font-medium">Passo 3 de 4</p>
        <h1 className="font-heading text-2xl font-semibold">Sua rotina</h1>
        <p className="text-muted-foreground text-sm">
          Escolha a intensidade e quanto tempo você tem disponível por semana.
        </p>
      </div>

      <FormFeedback state={state} />

      {/* Seletor de intensidade — hidden input sincronizado com RHF */}
      <div className="space-y-2">
        <Label>Intensidade da rotina</Label>
        {/* Input oculto serializado no FormData */}
        <input
          type="hidden"
          name="routine_level"
          value={selectedLevel}
          readOnly
        />
        <div className="grid gap-3">
          {LEVEL_CARDS.map((card) => (
            <button
              key={card.value}
              type="button"
              onClick={() => {
                setSelectedLevel(card.value);
                void form.setValue("routine_level", card.value, {
                  shouldValidate: true,
                });
              }}
              className={cn(
                "flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors",
                selectedLevel === card.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/40",
              )}
            >
              <span className="text-sm font-semibold">{card.label}</span>
              <span className="text-muted-foreground text-xs">{card.description}</span>
            </button>
          ))}
        </div>
        <FieldError
          msg={errors.routine_level?.message ?? serverErrors?.routine_level}
        />
      </div>

      {/* Minutos disponíveis por semana */}
      <div className="space-y-2">
        <Label htmlFor="available_minutes_per_week">
          Minutos disponíveis por semana
        </Label>
        <Input
          id="available_minutes_per_week"
          type="number"
          min={10}
          max={2000}
          aria-invalid={errors.available_minutes_per_week ? true : undefined}
          {...form.register("available_minutes_per_week", {
            valueAsNumber: true,
          })}
        />
        <FieldError
          msg={
            errors.available_minutes_per_week?.message ??
            serverErrors?.available_minutes_per_week
          }
        />
      </div>

      <SubmitButton pending={pending} pendingLabel="Calculando…">
        Ver sugestões →
      </SubmitButton>
    </form>
  );
}
