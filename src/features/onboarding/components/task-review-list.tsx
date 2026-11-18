"use client";

import { useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CatalogTask } from "@/features/onboarding/catalog";
import {
  type FormState,
  initialFormState,
} from "@/features/auth/form-state";
import { useValidatedSubmit } from "@/features/auth/components/use-validated-submit";
import { FormFeedback, SubmitButton } from "@/features/auth/components/form-parts";

type FrequencyType = "daily" | "weekly" | "biweekly" | "monthly";

const FREQ_LABELS: Record<FrequencyType, string> = {
  daily: "Diária",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

type TaskState = {
  include: boolean;
  title: string;
  estimated_minutes: number;
  frequency_type: FrequencyType;
};

// Schema mínimo client-side — validação real é feita pelo servidor
const tasksClientSchema = z.object({
  tasks: z.string().min(1),
});
type TasksClientValues = z.infer<typeof tasksClientSchema>;

type Props = {
  tasks: CatalogTask[];
  formAction: (_: FormState, formData: FormData) => Promise<FormState>;
};

const SELECT_CLASS =
  "border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex h-8 rounded-md border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function TaskReviewList({ tasks, formAction }: Props) {
  const [state, dispatch, pending] = useActionState(formAction, initialFormState);

  const form = useForm<TasksClientValues>({
    resolver: zodResolver(tasksClientSchema),
    defaultValues: {
      tasks: JSON.stringify(
        tasks.map((t) => ({
          id: t.id,
          include: true,
          title: t.title,
          estimated_minutes: t.estimated_minutes,
          frequency_type: t.frequency_type,
        })),
      ),
    },
  });

  const { formRef, onSubmit } = useValidatedSubmit(form, dispatch);

  const [taskStates, setTaskStates] = useState<Map<string, TaskState>>(() => {
    const map = new Map<string, TaskState>();
    for (const t of tasks) {
      map.set(t.id, {
        include: true,
        title: t.title,
        estimated_minutes: t.estimated_minutes,
        frequency_type: t.frequency_type,
      });
    }
    return map;
  });

  function updateTask(id: string, patch: Partial<TaskState>) {
    setTaskStates((prev) => {
      const current = prev.get(id);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(id, { ...current, ...patch });
      return next;
    });
  }

  const includedEntries = tasks.filter((t) => taskStates.get(t.id)?.include);
  const totalMinutes = includedEntries.reduce((sum, t) => {
    const s = taskStates.get(t.id);
    return sum + (s?.estimated_minutes ?? t.estimated_minutes);
  }, 0);

  // Serializa todas as tarefas. Tarefas excluídas preservam o título original
  // para não falhar na validação server-side (title: min(1)).
  const tasksJSON = JSON.stringify(
    tasks.map((t) => {
      const s = taskStates.get(t.id);
      const isIncluded = s?.include ?? false;
      // Para excluídas: usa título original; para incluídas: fallback ao original se vazio
      const title = isIncluded
        ? (s?.title?.trim() || t.title)
        : t.title;
      return {
        id: t.id,
        include: isIncluded,
        title,
        estimated_minutes: s?.estimated_minutes ?? t.estimated_minutes,
        frequency_type: s?.frequency_type ?? t.frequency_type,
      };
    }),
  );

  const noTasksSelected = includedEntries.length === 0;

  return (
    <form
      ref={formRef}
      action={dispatch}
      onSubmit={onSubmit}
      noValidate
      className="space-y-6"
    >
      {/* Cabeçalho com indicador de progresso */}
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm font-medium">Passo 4 de 4</p>
        <h1 className="font-heading text-2xl font-semibold">Sua rotina sugerida</h1>
        <p className="text-muted-foreground text-sm">
          Revise as tarefas, ajuste ou remova o que não se aplicar.
        </p>
      </div>

      <FormFeedback state={state} />

      {/* Lista de tarefas */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const s = taskStates.get(task.id);
          const include = s?.include ?? true;
          const title = s?.title ?? task.title;
          const estimatedMinutes = s?.estimated_minutes ?? task.estimated_minutes;
          const frequencyType = s?.frequency_type ?? task.frequency_type;

          return (
            <div
              key={task.id}
              className={
                "flex flex-col gap-2 rounded-lg border p-3 transition-opacity sm:flex-row sm:items-center" +
                (include ? "" : " opacity-50")
              }
            >
              {/* Checkbox include/exclude */}
              <input
                type="checkbox"
                id={`include-${task.id}`}
                checked={include}
                onChange={(e) =>
                  updateTask(task.id, { include: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
              />

              {/* Título editável */}
              <input
                type="text"
                value={title}
                disabled={!include}
                onChange={(e) => updateTask(task.id, { title: e.target.value })}
                aria-label="Título da tarefa"
                className="border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex-1 rounded-md border px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {/* Minutos estimados */}
              <input
                type="number"
                value={estimatedMinutes}
                disabled={!include}
                min={1}
                onChange={(e) =>
                  updateTask(task.id, {
                    estimated_minutes: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                aria-label="Minutos estimados"
                className="border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring w-16 rounded-md border px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="text-muted-foreground text-xs">min</span>

              {/* Frequência */}
              <select
                value={frequencyType}
                disabled={!include}
                onChange={(e) =>
                  updateTask(task.id, {
                    frequency_type: e.target.value as FrequencyType,
                  })
                }
                aria-label="Frequência"
                className={SELECT_CLASS}
              >
                {(Object.keys(FREQ_LABELS) as FrequencyType[]).map((f) => (
                  <option key={f} value={f}>
                    {FREQ_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* Campo oculto com JSON de todas as tarefas — sincronizado com taskStates */}
      <input
        type="hidden"
        {...form.register("tasks")}
        value={tasksJSON}
        readOnly
      />

      {/* Resumo + botão de aprovação */}
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          {includedEntries.length} tarefa{includedEntries.length !== 1 ? "s" : ""}{" "}
          · ~{totalMinutes} min/semana
        </p>
        {noTasksSelected && (
          <p className="text-destructive text-sm">
            Selecione ao menos uma tarefa para aprovar.
          </p>
        )}
        <SubmitButton
          pending={pending}
          pendingLabel="Aprovando…"
          disabled={pending || noTasksSelected}
        >
          Aprovar rotina
        </SubmitButton>
      </div>
    </form>
  );
}
