"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateHome } from "@/features/homes/actions";
import { updateHomeSchema } from "@/features/homes/schemas";
import { initialFormState } from "@/features/auth/form-state";
import { useValidatedSubmit } from "@/features/auth/components/use-validated-submit";
import { FormFeedback, SubmitButton } from "@/features/auth/components/form-parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HomeWithRooms } from "@/features/homes/queries";

// No cliente, resident_count é number (valueAsNumber); servidor usa coerce
const clientSchema = updateHomeSchema.extend({
  resident_count: z
    .number({ error: "Informe o número de moradores" })
    .int("Deve ser um número inteiro")
    .min(1, "Mínimo 1 morador")
    .max(20, "Máximo 20 moradores"),
});
type ClientFormValues = z.infer<typeof clientSchema>;

const SELECT_CLASS =
  "border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function FieldError({ msg }: { msg: string | undefined }) {
  if (!msg) return null;
  return <p className="text-destructive text-sm">{msg}</p>;
}

type Props = {
  home: Pick<
    HomeWithRooms,
    "name" | "property_type" | "ownership_type" | "household_type" | "resident_count"
  >;
};

export function HomeForm({ home }: Props) {
  const [state, formAction, pending] = useActionState(updateHome, initialFormState);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: home.name,
      property_type: home.property_type,
      ownership_type: home.ownership_type,
      household_type: home.household_type,
      resident_count: home.resident_count,
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
      <FormFeedback state={state} />

      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome da residência</Label>
        <Input
          id="name"
          type="text"
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          {...form.register("name")}
        />
        <FieldError msg={errors.name?.message ?? serverErrors?.["name"]} />
      </div>

      {/* Tipo de imóvel */}
      <div className="space-y-2">
        <Label htmlFor="property_type">Tipo de imóvel</Label>
        <select
          id="property_type"
          className={SELECT_CLASS}
          aria-invalid={errors.property_type ? true : undefined}
          {...form.register("property_type")}
        >
          <option value="apartamento">Apartamento</option>
          <option value="casa">Casa</option>
          <option value="sobrado">Sobrado</option>
          <option value="studio_kitnet">Studio/Kitnet</option>
          <option value="outro">Outro</option>
        </select>
        <FieldError msg={errors.property_type?.message ?? serverErrors?.["property_type"]} />
      </div>

      {/* Posse */}
      <div className="space-y-2">
        <Label htmlFor="ownership_type">Posse</Label>
        <select
          id="ownership_type"
          className={SELECT_CLASS}
          aria-invalid={errors.ownership_type ? true : undefined}
          {...form.register("ownership_type")}
        >
          <option value="proprio">Próprio</option>
          <option value="alugado">Alugado</option>
          <option value="outro">Outro</option>
        </select>
        <FieldError msg={errors.ownership_type?.message ?? serverErrors?.["ownership_type"]} />
      </div>

      {/* Composição */}
      <div className="space-y-2">
        <Label htmlFor="household_type">Composição</Label>
        <select
          id="household_type"
          className={SELECT_CLASS}
          aria-invalid={errors.household_type ? true : undefined}
          {...form.register("household_type")}
        >
          <option value="sozinho">Sozinho</option>
          <option value="casal">Casal</option>
          <option value="familia">Família</option>
          <option value="compartilhada">Compartilhada</option>
          <option value="outro">Outro</option>
        </select>
        <FieldError msg={errors.household_type?.message ?? serverErrors?.["household_type"]} />
      </div>

      {/* Moradores */}
      <div className="space-y-2">
        <Label htmlFor="resident_count">Número de moradores</Label>
        <Input
          id="resident_count"
          type="number"
          min={1}
          max={20}
          aria-invalid={errors.resident_count ? true : undefined}
          {...form.register("resident_count", { valueAsNumber: true })}
        />
        <FieldError msg={errors.resident_count?.message ?? serverErrors?.["resident_count"]} />
      </div>

      <SubmitButton pending={pending} pendingLabel="Salvando…">
        Salvar alterações
      </SubmitButton>
    </form>
  );
}
