"use client";

import { startTransition, useRef, type FormEvent } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Valida no cliente com React Hook Form e, se passar, envia o mesmo FormData
 * para a Server Action (que valida de novo). Sem JavaScript, o `action` do
 * formulário continua funcionando sozinho.
 */
export function useValidatedSubmit<T extends FieldValues, C, O>(
  form: UseFormReturn<T, C, O>,
  formAction: (formData: FormData) => void,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void form.handleSubmit(() => {
      const element = formRef.current;
      if (!element) return;
      startTransition(() => formAction(new FormData(element)));
    })(event);
  };
  return { formRef, onSubmit };
}
