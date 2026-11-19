"use client";

import { useActionState } from "react";
import type { FormState } from "@/features/auth/form-state";
import { initialFormState } from "@/features/auth/form-state";
import { SHOPPING_CATEGORIES } from "@/features/members/schemas";

const CATEGORY_LABELS: Record<string, string> = {
  limpeza: "Limpeza",
  higiene: "Higiene",
  cozinha: "Cozinha",
  lavanderia: "Lavanderia",
  alimentacao: "Alimentação",
  outros: "Outros",
};

type Props = {
  userId: string;
  permissions: {
    can_manage_tasks: boolean;
    can_complete_tasks: boolean;
    can_manage_shopping: boolean;
    can_purchase_shopping: boolean;
    can_manage_events: boolean;
  };
  taskRoomIds: string[];
  shoppingCategories: string[];
  rooms: { id: string; name: string }[];
  action: (_: FormState, fd: FormData) => Promise<FormState>;
};

export function PermissionsForm({
  userId,
  permissions,
  taskRoomIds,
  shoppingCategories,
  rooms,
  action,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="space-y-8 max-w-lg">
      <input type="hidden" name="user_id" value={userId} />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tarefas
        </h2>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="can_manage_tasks"
              value="true"
              defaultChecked={permissions.can_manage_tasks}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Pode criar, editar e excluir tarefas</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="can_complete_tasks"
              value="true"
              defaultChecked={permissions.can_complete_tasks}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Pode completar, desfazer e pular tarefas</span>
          </label>
        </div>

        {rooms.length > 0 && (
          <div className="pl-4 border-l-2 border-muted space-y-2 mt-3">
            <p className="text-xs text-muted-foreground">
              Cômodos permitidos (vazio = todos os cômodos):
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {rooms.map((room) => (
                <label key={room.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="task_room_id"
                    value={room.id}
                    defaultChecked={taskRoomIds.includes(room.id)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm">{room.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Compras
        </h2>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="can_manage_shopping"
              value="true"
              defaultChecked={permissions.can_manage_shopping}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Pode adicionar, editar e excluir itens</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="can_purchase_shopping"
              value="true"
              defaultChecked={permissions.can_purchase_shopping}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Pode marcar itens como comprados</span>
          </label>
        </div>

        <div className="pl-4 border-l-2 border-muted space-y-2 mt-3">
          <p className="text-xs text-muted-foreground">
            Categorias permitidas (vazio = todas as categorias):
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {SHOPPING_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="shopping_category"
                  value={cat}
                  defaultChecked={shoppingCategories.includes(cat)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm">{CATEGORY_LABELS[cat] ?? cat}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Eventos
        </h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="can_manage_events"
            value="true"
            defaultChecked={permissions.can_manage_events}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm">Pode criar, editar e excluir eventos</span>
        </label>
      </section>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-green-600 dark:text-green-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar permissões"}
      </button>
    </form>
  );
}
