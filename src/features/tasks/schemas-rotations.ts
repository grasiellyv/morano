import { z } from "zod";

export const createRotationSchema = z.object({
  name: z.string().trim().min(1, { error: "Nome obrigatório" }).max(100),
  rotation_day: z.coerce.number().int().min(0).max(6),
});

export const updateRotationSchema = createRotationSchema.extend({
  id: z.string().uuid(),
});

export const deleteRotationSchema = z.object({
  id: z.string().uuid(),
});

export const addRotationMemberSchema = z.object({
  rotation_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  sort_order: z.coerce.number().int().default(0),
});

export const removeRotationMemberSchema = z.object({
  rotation_id: z.string().uuid(),
  profile_id: z.string().uuid(),
});

export const reorderRotationMemberSchema = z.object({
  rotation_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  sort_order: z.coerce.number().int(),
});

export const setTaskRotationSchema = z.object({
  task_id: z.string().uuid(),
  rotation_id: z.string().uuid().nullable(),
});

export function resolveCurrentMember(
  members: { profile_id: string; sort_order: number }[],
  currentIndex: number,
  absentProfileIds: Set<string>
): string | null {
  if (members.length === 0) return null;
  const start = currentIndex % members.length;
  for (let i = 0; i < members.length; i++) {
    const idx = (start + i) % members.length;
    if (!absentProfileIds.has(members[idx]!.profile_id)) {
      return members[idx]!.profile_id;
    }
  }
  return null;
}
