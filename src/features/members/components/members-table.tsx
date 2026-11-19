"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { HomeMember } from "@/features/members/queries";
import type { FormState } from "@/features/auth/form-state";
import { removeMember, transferOwnership } from "@/features/members/actions";
import { initialFormState } from "@/features/auth/form-state";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

type Props = {
  members: HomeMember[];
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member";
};

export function MembersTable({ members, currentUserId, currentUserRole }: Props) {
  const isOwner = currentUserRole === "owner";
  const isAdminOrOwner = isOwner || currentUserRole === "admin";

  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Membro</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Papel</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Desde</th>
            {isAdminOrOwner ? (
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((m) => (
            <MemberRow
              key={m.user_id}
              member={m}
              isCurrentUser={m.user_id === currentUserId}
              currentUserRole={currentUserRole}
              isAdminOrOwner={isAdminOrOwner}
              isOwner={isOwner}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberRow({
  member,
  isCurrentUser,
  currentUserRole,
  isAdminOrOwner,
  isOwner,
}: {
  member: HomeMember;
  isCurrentUser: boolean;
  currentUserRole: "owner" | "admin" | "member";
  isAdminOrOwner: boolean;
  isOwner: boolean;
}) {
  const [removeState, removeAction, removePending] = useActionState<FormState, FormData>(
    removeMember,
    initialFormState,
  );
  const [transferState, transferAction, transferPending] = useActionState<FormState, FormData>(
    transferOwnership,
    initialFormState,
  );

  const canRemove =
    isAdminOrOwner &&
    !isCurrentUser &&
    (member.role !== "owner" || isOwner);

  const canTransfer = isOwner && !isCurrentUser;

  return (
    <tr>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium">{member.full_name ?? "Sem nome"}</p>
          {isCurrentUser ? (
            <p className="text-xs text-muted-foreground">Você</p>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-block rounded px-2 py-0.5 text-xs font-medium",
            member.role === "owner"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              : member.role === "admin"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                : "bg-muted text-muted-foreground",
          )}
        >
          {ROLE_LABEL[member.role] ?? member.role}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
        {new Date(member.joined_at).toLocaleDateString("pt-BR")}
      </td>
      {isAdminOrOwner ? (
        <td className="px-4 py-3 text-right space-x-2">
          {removeState.status === "error" ? (
            <span className="text-xs text-destructive">{removeState.message}</span>
          ) : null}
          {transferState.status === "error" ? (
            <span className="text-xs text-destructive">{transferState.message}</span>
          ) : null}

          {isAdminOrOwner && member.role === "member" ? (
            <Link
              href={`/casa/membros/${member.user_id}/permissoes`}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Permissões
            </Link>
          ) : null}

          {canTransfer ? (
            <form action={transferAction} className="inline">
              <input type="hidden" name="new_owner_id" value={member.user_id} />
              <button
                type="submit"
                disabled={transferPending}
                className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
                onClick={(e) => {
                  if (!confirm(`Transferir propriedade para ${member.full_name ?? "este membro"}?`)) {
                    e.preventDefault();
                  }
                }}
              >
                {transferPending ? "Transferindo..." : "Transferir propriedade"}
              </button>
            </form>
          ) : null}

          {canRemove ? (
            <form action={removeAction} className="inline">
              <input type="hidden" name="user_id" value={member.user_id} />
              <button
                type="submit"
                disabled={removePending}
                className="text-xs text-destructive hover:text-destructive/80 underline disabled:opacity-50"
                onClick={(e) => {
                  if (!confirm(`Remover ${member.full_name ?? "este membro"} da residência?`)) {
                    e.preventDefault();
                  }
                }}
              >
                {removePending ? "Removendo..." : "Remover"}
              </button>
            </form>
          ) : null}
        </td>
      ) : null}
    </tr>
  );
}
