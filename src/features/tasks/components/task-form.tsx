"use client";

import { useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema } from "@/features/tasks/schemas";
import {
  type FormState,
  initialFormState,
} from "@/features/auth/form-state";
import {
  Field,
  FormFeedback,
  SubmitButton,
} from "@/features/auth/components/form-parts";
import { useValidatedSubmit } from "@/features/auth/components/use-validated-submit";
import { Label } from "@/components/ui/label";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const selectClass =
  "border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

export interface TaskFormProps {
  mode: "create" | "edit";
  taskId?: string;
  initialValues?: {
    title?: string;
    description?: string;
    priority?: string;
    estimated_minutes?: number;
    room_id?: string | null;
    frequency_type?: string;
    start_date?: string;
    end_date?: string | null;
    interval_value?: number | null;
    interval_unit?: string | null;
    weekdays?: number[] | null;
    month_day?: number | null;
  };
  rooms: Array<{ id: string; name: string }>;
  formAction: (_: FormState, fd: FormData) => Promise<FormState>;
  onSuccess?: () => void;
}

export function TaskForm({
  mode,
  taskId,
  initialValues,
  rooms,
  formAction,
  onSuccess,
}: TaskFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [state, dispatchAction, pending] = useActionState(formAction, initialFormState);

  const form = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      priority: (initialValues?.priority as "baixa" | "media" | "alta") ?? "media",
      estimated_minutes: initialValues?.estimated_minutes ?? 30,
      room_id: initialValues?.room_id ?? null,
      frequency_type:
        (initialValues?.frequency_type as
          | "once"
          | "daily"
          | "weekly"
          | "biweekly"
          | "monthly"
          | "custom") ?? "once",
      interval_value: initialValues?.interval_value ?? null,
      interval_unit:
        (initialValues?.interval_unit as "day" | "week" | "month") ?? null,
      weekdays: initialValues?.weekdays ?? null,
      month_day: initialValues?.month_day ?? null,
      start_date: initialValues?.start_date ?? today,
      end_date: initialValues?.end_date ?? null,
    },
  });

  const { formRef, onSubmit: handleValidatedSubmit } = useValidatedSubmit(
    form,
    dispatchAction,
  );

  const frequencyType = form.watch("frequency_type");
  const errors = form.formState.errors;

  // Track weekdays selection in local state for the hidden input
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    initialValues?.weekdays ?? [],
  );

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  // Call onSuccess after render when the action returns success
  useEffect(() => {
    if (state.status === "success") onSuccess?.();
  }, [state.status]);

  return (
    <form
      ref={formRef}
      action={dispatchAction}
      onSubmit={handleValidatedSubmit}
      noValidate
      className="space-y-5"
    >
      <FormFeedback state={state} />

      {mode === "edit" && taskId ? (
        <input type="hidden" name="id" value={taskId} />
      ) : null}

      {/* Title */}
      <Field
        label="Título"
        registration={form.register("title")}
        error={errors.title?.message ?? state.fieldErrors?.title}
      />

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Prioridade</Label>
        <select
          id="priority"
          className={selectClass}
          aria-invalid={errors.priority ? true : undefined}
          {...form.register("priority")}
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </select>
        {errors.priority?.message ?? state.fieldErrors?.priority ? (
          <p className="text-destructive text-sm">
            {errors.priority?.message ?? state.fieldErrors?.priority}
          </p>
        ) : null}
      </div>

      {/* Estimated minutes */}
      <Field
        label="Duração estimada (minutos)"
        type="number"
        min={1}
        max={480}
        registration={form.register("estimated_minutes")}
        error={errors.estimated_minutes?.message ?? state.fieldErrors?.estimated_minutes}
      />

      {/* Room (optional) */}
      {rooms.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="room_id">Cômodo (opcional)</Label>
          <select
            id="room_id"
            className={selectClass}
            {...form.register("room_id")}
          >
            <option value="">Nenhum</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Frequency type */}
      <div className="space-y-2">
        <Label htmlFor="frequency_type">Frequência</Label>
        <select
          id="frequency_type"
          className={selectClass}
          aria-invalid={errors.frequency_type ? true : undefined}
          {...form.register("frequency_type")}
        >
          <option value="once">Uma vez</option>
          <option value="daily">Diário</option>
          <option value="weekly">Semanal</option>
          <option value="biweekly">Quinzenal</option>
          <option value="monthly">Mensal</option>
          <option value="custom">Personalizado</option>
        </select>
        {errors.frequency_type?.message ?? state.fieldErrors?.frequency_type ? (
          <p className="text-destructive text-sm">
            {errors.frequency_type?.message ?? state.fieldErrors?.frequency_type}
          </p>
        ) : null}
      </div>

      {/* Conditional: custom interval */}
      {frequencyType === "custom" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="A cada"
            type="number"
            min={1}
            max={365}
            registration={form.register("interval_value")}
            error={errors.interval_value?.message ?? state.fieldErrors?.interval_value}
          />
          <div className="space-y-2">
            <Label htmlFor="interval_unit">Unidade</Label>
            <select
              id="interval_unit"
              className={selectClass}
              {...form.register("interval_unit")}
            >
              <option value="day">Dia(s)</option>
              <option value="week">Semana(s)</option>
              <option value="month">Mês(es)</option>
            </select>
          </div>
        </div>
      ) : null}

      {/* Conditional: weekdays for weekly/biweekly */}
      {(frequencyType === "weekly" || frequencyType === "biweekly") ? (
        <div className="space-y-2">
          <Label>Dias da semana</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekday(day)}
                className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                  selectedWeekdays.includes(day)
                    ? "bg-foreground text-background border-foreground"
                    : "border-input bg-background text-foreground hover:bg-muted"
                }`}
                aria-pressed={selectedWeekdays.includes(day)}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Hidden input with JSON-encoded weekdays for FormData */}
          <input
            type="hidden"
            name="weekdays"
            value={selectedWeekdays.length > 0 ? JSON.stringify(selectedWeekdays) : ""}
          />
          {errors.weekdays?.message ?? state.fieldErrors?.weekdays ? (
            <p className="text-destructive text-sm">
              {(errors.weekdays as { message?: string })?.message ?? state.fieldErrors?.weekdays}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Conditional: month_day for monthly */}
      {frequencyType === "monthly" ? (
        <Field
          label="Dia do mês"
          type="number"
          min={1}
          max={31}
          registration={form.register("month_day")}
          error={errors.month_day?.message ?? state.fieldErrors?.month_day}
        />
      ) : null}

      {/* Start date */}
      <Field
        label="Data de início"
        type="date"
        registration={form.register("start_date")}
        error={errors.start_date?.message ?? state.fieldErrors?.start_date}
      />

      {/* End date (optional, hidden for once) */}
      {frequencyType !== "once" ? (
        <Field
          label="Data de fim (opcional)"
          type="date"
          registration={form.register("end_date")}
          error={errors.end_date?.message ?? state.fieldErrors?.end_date}
        />
      ) : null}

      <SubmitButton pending={pending} pendingLabel="Salvando…">
        {mode === "create" ? "Criar tarefa" : "Salvar alterações"}
      </SubmitButton>
    </form>
  );
}
