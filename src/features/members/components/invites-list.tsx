"use client";

import { useActionState } from "react";
import type { PendingInvite } from "@/features/members/queries";

type InviteRow = Pick<PendingInvite, "id" | "invited_email" | "role" | "expires_at">;
import type { FormState } from "@/features/auth/form-state";
import { initialFormState } from "@/features/auth/form-state";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  member: "Membro",
};

type Props = {
  invites: InviteRow[];
  revokeInviteAction: (_: FormState, fd: FormData) => Promise<FormState>;
};

export function InvitesList({ invites, revokeInviteAction }: Props) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-mail</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Papel</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Expira em</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} revokeInviteAction={revokeInviteAction} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InviteRow({
  invite,
  revokeInviteAction,
}: {
  invite: InviteRow;
  revokeInviteAction: (_: FormState, fd: FormData) => Promise<FormState>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    revokeInviteAction,
    initialFormState,
  );

  const expiresAt = new Date(invite.expires_at);
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <tr>
      <td className="px-4 py-3">{invite.invited_email}</td>
      <td className="px-4 py-3">{ROLE_LABEL[invite.role] ?? invite.role}</td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className={isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
          {expiresAt.toLocaleDateString("pt-BR")}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {state.status === "error" ? (
          <span className="text-xs text-destructive mr-2">{state.message}</span>
        ) : null}
        <form action={action} className="inline">
          <input type="hidden" name="invite_id" value={invite.id} />
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-destructive hover:text-destructive/80 underline disabled:opacity-50"
          >
            {pending ? "Revogando..." : "Revogar"}
          </button>
        </form>
      </td>
    </tr>
  );
}
