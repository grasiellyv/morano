"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { addPet } from "@/features/pets/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { SPECIES, SPECIES_LABELS, type Species } from "@/features/pets/schemas";
import { SpeciesIcon } from "@/features/pets/species-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function chipClass(selected: boolean) {
  return [
    "inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-medium transition-colors",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
    selected
      ? "border-transparent bg-[var(--nav-active)] text-[var(--nav-active-ink)]"
      : "border-border bg-card text-foreground hover:bg-secondary",
  ].join(" ");
}

export function AddPetForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [species, setSpecies] = useState<Species>("cachorro");

  const [state, dispatch, pending] = useActionState(
    async (prev: FormState, fd: FormData): Promise<FormState> => {
      const result = await addPet(prev, fd);
      if (result.status === "success") setSpecies("cachorro");
      return result;
    },
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      nameRef.current?.focus();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={dispatch}
      className="space-y-4 rounded-[16px] border border-border p-4"
      style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
    >
      <h2 className="text-[15px] font-semibold">Novo animal</h2>

      <label className="block">
        <span className="mb-2 block text-[12.5px] font-semibold">Nome</span>
        <Input
          ref={nameRef}
          name="name"
          required
          maxLength={60}
          placeholder="Ex.: Thor"
          autoComplete="off"
          disabled={pending}
          aria-invalid={!!state.fieldErrors?.name}
          style={{ height: 44 }}
        />
        {state.fieldErrors?.name ? (
          <span className="mt-1 block text-xs text-destructive">{state.fieldErrors.name}</span>
        ) : null}
      </label>

      <div role="radiogroup" aria-labelledby="pet-species">
        <p id="pet-species" className="mb-2 text-[12.5px] font-semibold">Espécie</p>
        <input type="hidden" name="species" value={species} />
        <div className="flex flex-wrap gap-1.5">
          {SPECIES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={species === s}
              onClick={() => setSpecies(s)}
              disabled={pending}
              className={chipClass(species === s)}
            >
              <SpeciesIcon species={s} size={15} />
              {SPECIES_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-2 block text-[12.5px] font-semibold">
          Cuidados e necessidades <span className="font-normal text-muted-foreground">(opcional)</span>
        </span>
        <textarea
          name="notes"
          rows={3}
          maxLength={500}
          disabled={pending}
          placeholder="Ração, remédio, passeio, veterinário…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
      </label>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-xs text-destructive">{state.message}</p>
      ) : null}

      <Button
        type="submit"
        variant="add"
        disabled={pending}
        className="w-full gap-2 text-[15px] font-semibold"
        style={{ height: 48 }}
      >
        <Plus size={18} aria-hidden />
        {pending ? "Adicionando…" : "Adicionar animal"}
      </Button>
    </form>
  );
}
