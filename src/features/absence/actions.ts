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
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const parsed = setAbsenceSchema.safeParse({
    absence_start: textField(fd, "absence_start"),
    absence_end: textField(fd, "absence_end"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.current_home_id) {
    return { status: "error", message: "Residência não encontrada" };
  }
  const homeId = profile.current_home_id;

  const { error } = await supabase
    .from("home_members")
    .update({
      absence_start: parsed.data.absence_start,
      absence_end: parsed.data.absence_end,
    })
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (error) {
    return { status: "error", message: "Erro ao salvar" };
  }

  revalidatePath("/rotina");
  revalidatePath("/configuracoes");
  return { status: "success", message: "Modo ausência ativado" };
}

export async function clearAbsence(_fd: FormData): Promise<void> {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch {
    return;
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.current_home_id) return;
  const homeId = profile.current_home_id;

  await supabase
    .from("home_members")
    .update({
      absence_start: null,
      absence_end: null,
    })
    .eq("user_id", userId)
    .eq("home_id", homeId);

  revalidatePath("/rotina");
  revalidatePath("/configuracoes");
}
