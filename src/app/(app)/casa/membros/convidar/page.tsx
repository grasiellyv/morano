import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { InviteForm } from "@/features/members/components/invite-form";
import { inviteMember } from "@/features/members/actions";

export const metadata: Metadata = { title: "Convidar membro" };

export default async function Page() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("home_members")
    .select("role, home_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    redirect("/casa/membros");
  }

  return (
    <>
      <PageHeader
        title="Convidar membro"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/casa/membros">Voltar</Link>
          </Button>
        }
      />

      <div className="max-w-md">
        <p className="text-sm text-muted-foreground mb-6">
          Copie o link gerado e envie para a pessoa. Ela precisa ter uma conta no MORANO para aceitar.
        </p>
        <InviteForm inviteMemberAction={inviteMember} />
      </div>
    </>
  );
}
