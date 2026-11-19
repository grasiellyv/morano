"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  type FormState,
  fieldErrorsFrom,
  textField,
} from "@/features/auth/form-state";
import { setAbsenceSchema } from "@/features/absence/schemas";

export async function setAbsence(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();

  const parsed = setAbsenceSchema.safeParse({
    absence_start: textField(fd, "absence_start"),
    absence_end: textField(fd, "absence_end"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.rpc("set_my_absence", {
    p_start: parsed.data.absence_start,
    p_end: parsed.data.absence_end,
  });

  if (error) {
    return { status: "error", message: "Erro ao salvar" };
  }

  revalidatePath("/rotina");
  revalidatePath("/configuracoes");
  return { status: "success", message: "Modo ausência ativado" };
}

export async function clearAbsence(_fd: FormData): Promise<void> {
  try {
    await requireUser();
  } catch {
    return;
  }

  const supabase = await createClient();

  await supabase.rpc("clear_my_absence");

  revalidatePath("/rotina");
  revalidatePath("/configuracoes");
}
