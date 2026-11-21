"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/features/auth/form-state";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TaskWithRoutine } from "@/features/tasks/queries";

type Routine = NonNullable<TaskWithRoutine["routine"]>;

type Props = {
  taskId: string;
  routine: Routine;
  editTaskRuleAction: (_: FormState, fd: FormData) => Promise<FormState>;
  onSuccess?: () => void;
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const selectClass =
  "border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
  "border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

export function ScheduleEditPanel({ taskId, routine, editTaskRuleAction, onSuccess }: Props) {
  const [state, dispatch, pending] = useActionState(editTaskRuleAction, initialFormState);
  const [freqType, setFreqType] = useState(routine.frequency_type);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(routine.weekdays ?? []);

  useEffect(() => {
    if (state.status === "success") onSuccess?.();
  }, [state.status]);

  function toggleWeekday(day: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="id" value={taskId} />

      <div className="space-y-1.5">
        <Label htmlFor="schedule-frequency">Frequência</Label>
        <select
          id="schedule-frequency"
          name="frequency_type"
          value={freqType}
          onChange={(e) =>
            setFreqType(
              e.target.value as "once" | "daily" | "weekly" | "biweekly" | "monthly" | "custom",
            )
          }
          className={selectClass}
        >
          <option value="once">Uma vez</option>
          <option value="daily">Diário</option>
          <option value="weekly">Semanal</option>
          <option value="biweekly">Quinzenal</option>
          <option value="monthly">Mensal</option>
          <option value="custom">Personalizado</option>
        </select>
        {state.fieldErrors?.frequency_type ? (
          <p className="text-xs text-destructive">{state.fieldErrors.frequency_type}</p>
        ) : null}
      </div>

      {freqType === "custom" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="schedule-interval-value">A cada</Label>
            <input
              id="schedule-interval-value"
              type="number"
              name="interval_value"
              min={1}
              max={365}
              defaultValue={routine.interval_value ?? 1}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schedule-interval-unit">Unidade</Label>
            <select
              id="schedule-interval-unit"
              name="interval_unit"
              defaultValue={routine.interval_unit ?? "day"}
              className={selectClass}
            >
              <option value="day">Dia(s)</option>
              <option value="week">Semana(s)</option>
              <option value="month">Mês(es)</option>
            </select>
          </div>
        </div>
      ) : null}

      {freqType === "weekly" || freqType === "biweekly" ? (
        <div className="space-y-1.5">
          <Label>Dias da semana</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekday(day)}
                aria-pressed={selectedWeekdays.includes(day)}
                className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                  selectedWeekdays.includes(day)
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-background text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="hidden"
            name="weekdays"
            value={selectedWeekdays.length > 0 ? JSON.stringify(selectedWeekdays) : ""}
          />
        </div>
      ) : null}

      {freqType === "monthly" ? (
        <div className="space-y-1.5">
          <Label htmlFor="schedule-month-day">Dia do mês</Label>
          <input
            id="schedule-month-day"
            type="number"
            name="month_day"
            min={1}
            max={31}
            defaultValue={routine.month_day ?? 1}
            className={inputClass}
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="schedule-start-date">Data de início</Label>
        <input
          id="schedule-start-date"
          type="date"
          name="start_date"
          defaultValue={routine.start_date}
          required
          className={inputClass}
        />
        {state.fieldErrors?.start_date ? (
          <p className="text-xs text-destructive">{state.fieldErrors.start_date}</p>
        ) : null}
      </div>

      {freqType !== "once" ? (
        <div className="space-y-1.5">
          <Label htmlFor="schedule-end-date">Data de fim (opcional)</Label>
          <input
            id="schedule-end-date"
            type="date"
            name="end_date"
            defaultValue={routine.end_date ?? ""}
            className={inputClass}
          />
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <p className="text-sm text-green-600">{state.message}</p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Salvar agendamento"}
      </Button>
    </form>
  );
}
