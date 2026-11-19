import { z } from "zod";

export const SHOPPING_CATEGORIES = [
  "limpeza",
  "higiene",
  "cozinha",
  "lavanderia",
  "alimentacao",
  "outros",
] as const;

export const setMemberPermissionsSchema = z.object({
  user_id: z.string().uuid({ message: "ID inválido" }),
  can_manage_tasks: z.boolean(),
  can_complete_tasks: z.boolean(),
  can_manage_shopping: z.boolean(),
  can_purchase_shopping: z.boolean(),
  can_manage_events: z.boolean(),
  task_room_ids: z.array(z.string().uuid()),
  shopping_categories: z.array(z.enum(SHOPPING_CATEGORIES)),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }),
  role: z.enum(["admin", "member"]).default("member"),
});

export const revokeInviteSchema = z.object({
  invite_id: z.string().uuid({ message: "ID inválido" }),
});

export const removeMemberSchema = z.object({
  user_id: z.string().uuid({ message: "ID inválido" }),
});

export const transferOwnershipSchema = z.object({
  new_owner_id: z.string().uuid({ message: "ID inválido" }),
});
