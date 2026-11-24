import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getPendingInvites } from "@/features/members/queries";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { InvitesList } from "@/features/members/components/invites-list";
import { revokeInvite } from "@/features/members/actions";

export const metadata: Metadata = { title: "Convites pendentes" };

export default async function Page() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("home_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    redirect("/casa/membros");
  }

  const invites = await getPendingInvites(supabase);

  return (
    <>
      <PageHeader
        title="Convites pendentes"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/casa/membros">Voltar</Link>
          </Button>
        }
      />

      {invites.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum convite pendente.</p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/casa/membros/convidar" className="inline-flex items-center gap-1">Convidar membro<ArrowRight size={16} aria-hidden /></Link>
          </Button>
        </div>
      ) : (
        <InvitesList invites={invites} revokeInviteAction={revokeInvite} />
      )}
    </>
  );
}
