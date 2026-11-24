export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type InviteRecord = {
  id: string;
  invited_email: string;
  role: "admin" | "member";
  status: InviteStatus;
  expires_at: string;
  created_at: string;
};

export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  revoked: "Revogado",
  expired: "Expirado",
};

export const INVITE_HISTORY_LIMIT = 20;

/** O banco só marca "expired" se alguém rodar a rotina; pendente vencido já conta como expirado. */
export function effectiveInviteStatus(
  invite: Pick<InviteRecord, "status" | "expires_at">,
  now: Date = new Date(),
): InviteStatus {
  if (invite.status === "pending" && new Date(invite.expires_at).getTime() <= now.getTime()) return "expired";
  return invite.status;
}

/** Pendentes de verdade (no prazo) × histórico (aceitos, revogados, expirados), mais recentes primeiro. */
export function splitInvites(
  all: InviteRecord[],
  now: Date = new Date(),
): { pending: InviteRecord[]; history: InviteRecord[] } {
  const byNewest = (a: InviteRecord, b: InviteRecord) => b.created_at.localeCompare(a.created_at);
  const resolved = all.map((i) => ({ ...i, status: effectiveInviteStatus(i, now) }));
  return {
    pending: resolved.filter((i) => i.status === "pending").sort(byNewest),
    history: resolved.filter((i) => i.status !== "pending").sort(byNewest).slice(0, INVITE_HISTORY_LIMIT),
  };
}
