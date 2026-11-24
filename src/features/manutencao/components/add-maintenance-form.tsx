"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createMaintenanceItem } from "@/features/manutencao/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const textareaClass =
  "min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none";

type Props = {
  rooms: Array<{ id: string; name: string }>;
};

export function AddMaintenanceForm({ rooms }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [titleValue, setTitleValue] = useState("");
  const [showExtras, setShowExtras] = useState(false);

  const wrappedCreate = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await createMaintenanceItem(prev, fd);
    if (result.status === "success") {
      setTitleValue("");
      setShowExtras(false);
      toast.success("Item adicionado.");
    }
    return result;
  };

  const [state, dispatch, pending] = useActionState(wrappedCreate, initialFormState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      titleRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={dispatch} className="space-y-3">
      <div className="flex gap-2">
        <Input
          ref={titleRef}
          name="title"
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          placeholder="Descrever o problema ou serviço…"
          autoComplete="off"
          required
          disabled={pending}
          aria-label="Título"
          aria-invalid={!!state.fieldErrors?.title}
          className="flex-1"
        />
        <Button type="submit" variant="add" disabled={pending}>
          <Plus aria-hidden strokeWidth={1.75} />
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>

      {state.fieldErrors?.title ? (
        <p className="text-xs text-destructive">{state.fieldErrors.title}</p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowExtras((v) => !v)}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        {showExtras ? "Menos opções" : "Mais opções (descrição, cômodo, notas)"}
      </button>

      {showExtras ? (
        <div className="space-y-3 pt-1">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Descrição</label>
            <textarea
              name="description"
              disabled={pending}
              className={textareaClass}
              placeholder="Detalhes adicionais…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Cômodo</label>
            <select name="room_id" disabled={pending} className={selectClass}>
              <option value="">Nenhum</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Notas</label>
            <textarea
              name="notes"
              disabled={pending}
              className={textareaClass}
              placeholder="Observações internas…"
            />
          </div>
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
