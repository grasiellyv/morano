"use client";

import { useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addRoom, updateRoom, deleteRoom } from "@/features/homes/actions";
import { addRoomSchema, updateRoomSchema } from "@/features/homes/schemas";
import { initialFormState } from "@/features/auth/form-state";
import { useValidatedSubmit } from "@/features/auth/components/use-validated-submit";
import { FormFeedback, SubmitButton } from "@/features/auth/components/form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RoomType } from "@/features/onboarding/catalog";

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  sala: "Sala",
  cozinha: "Cozinha",
  quarto: "Quarto",
  banheiro: "Banheiro",
  lavanderia: "Lavanderia",
  escritorio: "Escritório",
  varanda: "Varanda",
  garagem: "Garagem",
  outro: "Outro",
};

const SELECT_CLASS =
  "border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type Room = { id: string; name: string; room_type: RoomType; position: number };

// ---------------------------------------------------------------------------
// Add Room Form
// ---------------------------------------------------------------------------

type AddRoomSchema = z.infer<typeof addRoomSchema>;

export function AddRoomForm() {
  const [state, formAction, pending] = useActionState(addRoom, initialFormState);

  const form = useForm<AddRoomSchema>({
    resolver: zodResolver(addRoomSchema),
    defaultValues: { name: "", room_type: "outro" },
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
      className="mt-4 rounded-lg border p-4 space-y-4"
    >
      <p className="text-sm font-medium">Novo cômodo</p>
      <FormFeedback state={state} />

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px] space-y-1">
          <Label htmlFor="add-room-name">Nome</Label>
          <Input
            id="add-room-name"
            type="text"
            placeholder="Ex.: Quarto principal"
            aria-invalid={errors.name ? true : undefined}
            {...form.register("name")}
          />
          {(errors.name?.message ?? serverErrors?.["name"]) && (
            <p className="text-destructive text-xs">
              {errors.name?.message ?? serverErrors?.["name"]}
            </p>
          )}
        </div>

        <div className="flex-1 min-w-[140px] space-y-1">
          <Label htmlFor="add-room-type">Tipo</Label>
          <select
            id="add-room-type"
            className={SELECT_CLASS}
            aria-invalid={errors.room_type ? true : undefined}
            {...form.register("room_type")}
          >
            {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {(errors.room_type?.message ?? serverErrors?.["room_type"]) && (
            <p className="text-destructive text-xs">
              {errors.room_type?.message ?? serverErrors?.["room_type"]}
            </p>
          )}
        </div>
      </div>

      <SubmitButton pending={pending} pendingLabel="Adicionando…" className="w-full sm:w-auto">
        Adicionar cômodo
      </SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Edit Room Form (inline, per row)
// ---------------------------------------------------------------------------

type EditRoomFormProps = { room: Room; onCancel: () => void };
type UpdateRoomSchema = z.infer<typeof updateRoomSchema>;

function EditRoomForm({ room, onCancel }: EditRoomFormProps) {
  const [state, formAction, pending] = useActionState(updateRoom, initialFormState);

  const form = useForm<UpdateRoomSchema>({
    resolver: zodResolver(updateRoomSchema),
    defaultValues: { id: room.id, name: room.name, room_type: room.room_type },
  });

  const { formRef, onSubmit } = useValidatedSubmit(form, formAction);
  const errors = form.formState.errors;
  const serverErrors = state.fieldErrors;

  // Close the edit form automatically on success
  useEffect(() => {
    if (state.status === "success") onCancel();
  }, [state.status, onCancel]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="space-y-3"
    >
      <input type="hidden" {...form.register("id")} />

      <FormFeedback state={state} />

      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[140px] space-y-1">
          <Label htmlFor={`edit-name-${room.id}`}>Nome</Label>
          <Input
            id={`edit-name-${room.id}`}
            type="text"
            aria-invalid={errors.name ? true : undefined}
            {...form.register("name")}
          />
          {(errors.name?.message ?? serverErrors?.["name"]) && (
            <p className="text-destructive text-xs">
              {errors.name?.message ?? serverErrors?.["name"]}
            </p>
          )}
        </div>

        <div className="flex-1 min-w-[120px] space-y-1">
          <Label htmlFor={`edit-type-${room.id}`}>Tipo</Label>
          <select
            id={`edit-type-${room.id}`}
            className={SELECT_CLASS}
            aria-invalid={errors.room_type ? true : undefined}
            {...form.register("room_type")}
          >
            {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <SubmitButton pending={pending} pendingLabel="Salvando…" size="sm">
            Salvar
          </SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Delete Room Form
// ---------------------------------------------------------------------------

const deleteClientSchema = z.object({});
type DeleteClientSchema = z.infer<typeof deleteClientSchema>;

function DeleteRoomForm({ roomId }: { roomId: string }) {
  const [state, formAction, pending] = useActionState(deleteRoom, initialFormState);

  const form = useForm<DeleteClientSchema>({
    resolver: zodResolver(deleteClientSchema),
  });

  const { formRef, onSubmit } = useValidatedSubmit(form, formAction);

  return (
    <div>
      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate>
        <input type="hidden" name="id" value={roomId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={pending}
          className="text-destructive hover:text-destructive"
        >
          {pending ? "Removendo…" : "Remover"}
        </Button>
      </form>
      {state.status === "error" && state.message && (
        <p className="text-destructive text-xs mt-1">{state.message}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Room Row
// ---------------------------------------------------------------------------

function RoomRow({ room }: { room: Room }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="border rounded-lg p-4">
        <EditRoomForm room={room} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 border rounded-lg px-4 py-3">
      <div>
        <p className="text-sm font-medium">{room.name}</p>
        <p className="text-muted-foreground text-xs">{ROOM_TYPE_LABELS[room.room_type]}</p>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
        >
          Editar
        </Button>
        <DeleteRoomForm roomId={room.id} />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Room List
// ---------------------------------------------------------------------------

type RoomListProps = { rooms: Room[] };

export function RoomList({ rooms }: RoomListProps) {
  if (rooms.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        Nenhum cômodo cadastrado ainda.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rooms.map((room) => (
        <RoomRow key={room.id} room={room} />
      ))}
    </ul>
  );
}
