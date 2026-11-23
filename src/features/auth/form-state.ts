import type { z } from "zod";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Dados de retorno não-erro da action (ex: token gerado, id criado). */
  meta?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

/** Primeiro erro de cada campo, no formato que os formulários exibem. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

/** Lê um campo de texto do FormData (ausente ou arquivo vira texto vazio). */
export function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
