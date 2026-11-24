import Link from "next/link";
import { History, MailPlus, Users } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { FormState } from "@/features/auth/form-state";
import type { HomeMember } from "@/features/members/queries";
import { INVITE_STATUS_LABEL, type InviteRecord } from "@/features/members/invite-status";
import { InviteForm } from "@/features/members/components/invite-form";
import { InvitesList } from "@/features/members/components/invites-list";
import { MembersTable } from "@/features/members/components/members-table";

export type MembersSection = "moradores" | "convites" | "historico";

/** Seção pedida por `?secao=`; quem não é dono/admin só tem Moradores. */
export function resolveSection(raw: string | undefined, isAdminOrOwner: boolean): MembersSection {
  if (!isAdminOrOwner) return "moradores";
  return raw === "convites" || raw === "historico" ? raw : "moradores";
}

const ROLE_LABEL: Record<string, string> = { admin: "Administrador", member: "Membro" };
const NEW_INVITE_HREF = "/casa/membros?secao=convites&novo=1";

type Props = {
  members: HomeMember[];
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member";
  pending: InviteRecord[];
  history: InviteRecord[];
  /** Seção que deve abrir (vem do link); null = padrões. */
  openSection: MembersSection | null;
  showInviteForm: boolean;
  inviteMemberAction: (_: FormState, fd: FormData) => Promise<FormState>;
  revokeInviteAction: (_: FormState, fd: FormData) => Promise<FormState>;
};

export function MembersSections({
  members,
  currentUserId,
  currentUserRole,
  pending,
  history,
  openSection,
  showInviteForm,
  inviteMemberAction,
  revokeInviteAction,
}: Props) {
  const isAdminOrOwner = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div className="space-y-3">
      <CollapsibleSection
        id="moradores"
        card
        storageKey="casa:membros:moradores"
        defaultOpen
        forceOpen={openSection === "moradores"}
        icon={<Users size={16} strokeWidth={1.75} aria-hidden />}
        title="Moradores"
        meta={String(members.length)}
      >
        <div className="px-3 pb-3">
          <MembersTable members={members} currentUserId={currentUserId} currentUserRole={currentUserRole} />
        </div>
      </CollapsibleSection>

      {isAdminOrOwner ? (
        <>
          <CollapsibleSection
            id="convites"
            card
            storageKey="casa:membros:convites"
            defaultOpen={false}
            forceOpen={openSection === "convites" || showInviteForm}
            icon={<MailPlus size={16} strokeWidth={1.75} aria-hidden />}
            title="Convites pendentes"
            meta={String(pending.length)}
          >
            <div className="space-y-4 px-4 pb-4">
              {showInviteForm ? (
                <div className="max-w-md">
                  <p className="mb-4 text-sm text-muted-foreground">
                    Copie o link gerado e envie para a pessoa. Ela precisa ter uma conta no MORANO para aceitar.
                  </p>
                  <InviteForm inviteMemberAction={inviteMemberAction} />
                </div>
              ) : (
                <Link
                  href={NEW_INVITE_HREF}
                  className="inline-flex h-10 items-center gap-1.5 text-[13.5px] font-semibold text-add-ink no-underline hover:underline"
                >
                  <MailPlus size={16} strokeWidth={1.75} aria-hidden />
                  Novo convite
                </Link>
              )}

              {pending.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Nenhum convite pendente.</p>
              ) : (
                <InvitesList invites={pending} revokeInviteAction={revokeInviteAction} />
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="historico"
            card
            storageKey="casa:membros:historico"
            defaultOpen={false}
            forceOpen={openSection === "historico"}
            icon={<History size={16} strokeWidth={1.75} aria-hidden />}
            title="Histórico de convites"
            meta={String(history.length)}
          >
            <div className="px-4 pb-4">
              {history.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Nenhum convite no histórico.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {history.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                      <span className="min-w-0 flex-1 truncate font-medium">{i.invited_email}</span>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_LABEL[i.role] ?? i.role} · {new Date(i.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                        {INVITE_STATUS_LABEL[i.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CollapsibleSection>
        </>
      ) : null}
    </div>
  );
}
