"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  type FormState,
  fieldErrorsFrom,
  textField,
} from "@/features/auth/form-state";
import {
  inviteMemberSchema,
  revokeInviteSchema,
  removeMemberSchema,
  transferOwnershipSchema,
  setMemberPermissionsSchema,
  SHOPPING_CATEGORIES,
} from "@/features/members/schemas";

function friendlyError(msg: string | undefined): string {
  switch (msg) {
    case "no_active_home":
      return "Nenhuma residência ativa";
    case "forbidden":
      return "Você não tem permissão para esta ação";
    case "cannot_invite_as_owner":
      return "Não é possível convidar diretamente como proprietário";
    case "invite_not_found":
      return "Convite não encontrado";
    case "invite_already_used":
      return "Este convite já foi utilizado";
    case "invite_expired":
      return "Este convite expirou";
    case "email_mismatch":
      return "Este convite não é para o seu e-mail";
    case "member_not_found":
      return "Membro não encontrado";
    case "cannot_remove_last_owner":
      return "Não é possível remover o último proprietário";
    case "already_owner":
      return "Este membro já é o proprietário";
    case "invite_not_pending":
      return "Este convite não está pendente";
    default:
      return "Ocorreu um erro. Tente novamente.";
  }
}

function extractErrorMessage(error: { message?: string; details?: string } | null): string {
  if (!error) return "Ocorreu um erro";
  const raw = error.message ?? "";
  return friendlyError(raw);
}

export async function inviteMember(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();

  const parsed = inviteMemberSchema.safeParse({
    email: textField(fd, "email"),
    role: textField(fd, "role") || "member",
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data, error } = await supabase.rpc("invite_member", {
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });

  if (error) {
    return { status: "error", message: extractErrorMessage(error) };
  }

  const invite = Array.isArray(data) ? data[0] : data;

  revalidatePath("/casa/membros");
  revalidatePath("/casa/membros/convites");

  return {
    status: "success",
    message: `Convite enviado para ${parsed.data.email}`,
    fieldErrors: { token: invite?.token ?? "" },
  };
}

export async function acceptInvite(token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireUser();
  } catch {
    return { ok: false, error: "Faça login para aceitar o convite" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: token });

  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  revalidatePath("/casa");
  revalidatePath("/casa/membros");
  return { ok: true };
}

export async function revokeInvite(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();

  const parsed = revokeInviteSchema.safeParse({
    invite_id: textField(fd, "invite_id"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.rpc("revoke_invite", {
    p_invite_id: parsed.data.invite_id,
  });

  if (error) {
    return { status: "error", message: extractErrorMessage(error) };
  }

  revalidatePath("/casa/membros/convites");
  return { status: "success", message: "Convite revogado" };
}

export async function removeMember(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();

  const parsed = removeMemberSchema.safeParse({
    user_id: textField(fd, "user_id"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.rpc("remove_member", {
    p_user_id: parsed.data.user_id,
  });

  if (error) {
    return { status: "error", message: extractErrorMessage(error) };
  }

  revalidatePath("/casa");
  revalidatePath("/casa/membros");
  return { status: "success", message: "Membro removido" };
}

export async function transferOwnership(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();

  const parsed = transferOwnershipSchema.safeParse({
    new_owner_id: textField(fd, "new_owner_id"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.rpc("transfer_ownership", {
    p_new_owner_id: parsed.data.new_owner_id,
  });

  if (error) {
    return { status: "error", message: extractErrorMessage(error) };
  }

  revalidatePath("/casa/membros");
  return { status: "success", message: "Propriedade transferida com sucesso" };
}

export async function setMemberPermissions(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();

  const rawTaskRoomIds = fd.getAll("task_room_id").map(String).filter(Boolean);
  const rawCategories = fd.getAll("shopping_category").map(String).filter(Boolean);

  const parsed = setMemberPermissionsSchema.safeParse({
    user_id: textField(fd, "user_id"),
    can_manage_tasks: textField(fd, "can_manage_tasks") === "true",
    can_complete_tasks: textField(fd, "can_complete_tasks") === "true",
    can_manage_shopping: textField(fd, "can_manage_shopping") === "true",
    can_purchase_shopping: textField(fd, "can_purchase_shopping") === "true",
    can_manage_events: textField(fd, "can_manage_events") === "true",
    task_room_ids: rawTaskRoomIds,
    shopping_categories: rawCategories.filter((c) =>
      (SHOPPING_CATEGORIES as readonly string[]).includes(c),
    ),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabase.rpc("set_member_permissions", {
    p_target_user_id: parsed.data.user_id,
    p_can_manage_tasks: parsed.data.can_manage_tasks,
    p_can_complete_tasks: parsed.data.can_complete_tasks,
    p_can_manage_shopping: parsed.data.can_manage_shopping,
    p_can_purchase_shopping: parsed.data.can_purchase_shopping,
    p_can_manage_events: parsed.data.can_manage_events,
    p_task_room_ids: parsed.data.task_room_ids,
    p_shopping_categories: parsed.data.shopping_categories,
  });

  if (error) {
    return { status: "error", message: extractErrorMessage(error) };
  }

  revalidatePath(`/casa/membros/${parsed.data.user_id}/permissoes`);
  revalidatePath("/casa/membros");
  return { status: "success", message: "Permissões atualizadas" };
}
