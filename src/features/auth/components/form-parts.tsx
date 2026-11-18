"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = Omit<ComponentProps<"input">, "name"> & {
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  hint?: ReactNode;
};

/** Campo com rótulo, dica e erro ligados por aria-describedby. */
export function Field({ label, registration, error, hint, id, ...props }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-dica`;
  const errorId = `${inputId}-erro`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
        {...registration}
      />
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
  className,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean; pendingLabel: string }) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      aria-disabled={pending}
      className={cn("w-full", className)}
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Mensagem geral do formulário (erro ou sucesso), anunciada para leitores de tela. */
export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm",
        tone === "error"
          ? "border-destructive/30 text-destructive"
          : "border-border bg-sand/60 text-foreground",
      )}
    >
      {children}
    </p>
  );
}
