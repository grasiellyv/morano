import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getHomeMembers, getHomeInvites } from "@/features/members/queries";
import { splitInvites } from "@/features/members/invite-status";
import { inviteMember, revokeInvite } from "@/features/members/actions";
import { MembersSections, resolveSection } from "@/features/members/components/members-sections";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Membros" };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_home_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.current_home_id) {
    redirect("/onboarding");
  }

  // A RLS só devolve convites a dono/admin; para os demais a lista vem vazia.
  const [members, invites] = await Promise.all([getHomeMembers(supabase), getHomeInvites(supabase)]);
  const myMember = members.find((m) => m.user_id === user.id);
  const isAdminOrOwner = myMember?.role === "owner" || myMember?.role === "admin";

  const params = await searchParams;
  const requested = str(params["secao"]);
  const openSection = requested ? resolveSection(requested, isAdminOrOwner) : null;
  const showInviteForm = isAdminOrOwner && params["novo"] === "1";
  const { pending, history } = splitInvites(isAdminOrOwner ? invites : []);

  return (
    <>
      <PageHeader
        title="Membros"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/casa">Voltar</Link>
            </Button>
            {isAdminOrOwner ? (
              <Button asChild size="sm">
                <Link href="/casa/membros?secao=convites&novo=1">Convidar membro</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <MembersSections
        members={members}
        currentUserId={user.id}
        currentUserRole={myMember?.role ?? "member"}
        pending={pending}
        history={history}
        openSection={openSection}
        showInviteForm={showInviteForm}
        inviteMemberAction={inviteMember}
        revokeInviteAction={revokeInvite}
      />
    </>
  );
}
