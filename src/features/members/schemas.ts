import { z } from "zod";

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
