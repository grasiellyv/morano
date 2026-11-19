import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getHomeMembers } from "@/features/members/queries";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { MembersTable } from "@/features/members/components/members-table";

export const metadata: Metadata = { title: "Membros" };

export default async function Page() {
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

  const members = await getHomeMembers(supabase);
  const myMember = members.find((m) => m.user_id === user.id);
  const isAdminOrOwner = myMember?.role === "owner" || myMember?.role === "admin";

  return (
    <>
      <PageHeader
        title="Membros"
        actions={
          isAdminOrOwner ? (
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/casa/membros/convites">Convites pendentes</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/casa/membros/convidar">Convidar membro</Link>
              </Button>
            </div>
          ) : null
        }
      />

      <MembersTable
        members={members}
        currentUserId={user.id}
        currentUserRole={myMember?.role ?? "member"}
      />
    </>
  );
}
