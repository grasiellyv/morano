"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePet } from "@/features/pets/actions";
import { initialFormState } from "@/features/auth/form-state";
import { SPECIES_LABELS } from "@/features/pets/schemas";
import { SpeciesIcon } from "@/features/pets/species-icon";
import type { Pet } from "@/features/pets/queries";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

function PetRow({ pet, last }: { pet: Pet; last: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <li
      className="flex items-start gap-3 px-3.5 py-3"
      style={{ borderBottom: last ? undefined : "1px solid var(--border)", opacity: pending ? 0.5 : 1 }}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-[12px]"
        style={{ background: "#F6DDB9", color: "#6E420F" }}
      >
        <SpeciesIcon species={pet.species} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{pet.name}</p>
        <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
          {SPECIES_LABELS[pet.species]}
        </p>
        {pet.notes ? <p className="mt-1 whitespace-pre-line text-[13px]">{pet.notes}</p> : null}
      </div>
      <ConfirmDialog
        trigger={
          <button
            type="button"
            disabled={pending}
            aria-label={`Remover ${pet.name}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 size={17} aria-hidden />
          </button>
        }
        title="Remover animal"
        description={`Remover ${pet.name} da casa?`}
        confirmLabel="Remover"
        destructive
        onConfirm={() =>
          startTransition(async () => {
            const fd = new FormData();
            fd.set("id", pet.id);
            const res = await deletePet(initialFormState, fd);
            if (res.status === "error") toast.error(res.message ?? "Não foi possível remover.");
          })
        }
      />
    </li>
  );
}

export function PetList({ pets }: { pets: Pet[] }) {
  if (pets.length === 0) return null;
  return (
    <ul
      className="overflow-hidden rounded-[16px] border border-border"
      style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
    >
      {pets.map((p, i) => (
        <PetRow key={p.id} pet={p} last={i === pets.length - 1} />
      ))}
    </ul>
  );
}
