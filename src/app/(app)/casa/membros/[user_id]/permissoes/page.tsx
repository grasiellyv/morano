import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getHomeMembers } from "@/features/members/queries";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { PermissionsForm } from "@/features/members/components/permissions-form";
import { setMemberPermissions } from "@/features/members/actions";

export const metadata: Metadata = { title: "Permissões do membro" };

type Props = { params: Promise<{ user_id: string }> };

export default async function Page({ params }: Props) {
  const { user_id: targetUserId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: myMember } = await supabase
    .from("home_members")
    .select("role, home_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myMember || (myMember.role !== "owner" && myMember.role !== "admin")) {
    redirect("/casa/membros");
  }

  const homeId = myMember.home_id;

  const members = await getHomeMembers(supabase);
  const targetMember = members.find((m) => m.user_id === targetUserId);

  if (!targetMember) {
    redirect("/casa/membros");
  }

  const [{ data: perms }, { data: taskScopes }, { data: shopScopes }, { data: rooms }] =
    await Promise.all([
      supabase
        .from("home_member_permissions")
        .select(
          "can_manage_tasks, can_complete_tasks, can_manage_shopping, can_purchase_shopping, can_manage_events",
        )
        .eq("home_id", homeId)
        .eq("user_id", targetUserId)
        .maybeSingle(),
      supabase
        .from("home_member_task_scopes")
        .select("room_id")
        .eq("home_id", homeId)
        .eq("user_id", targetUserId),
      supabase
        .from("home_member_shopping_scopes")
        .select("category")
        .eq("home_id", homeId)
        .eq("user_id", targetUserId),
      supabase
        .from("rooms")
        .select("id, name")
        .eq("home_id", homeId)
        .order("position"),
    ]);

  const isMember = targetMember.role === "member";
  const memberName = targetMember.full_name ?? "Membro";

  return (
    <>
      <PageHeader
        title={`Permissões — ${memberName}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/casa/membros">Voltar</Link>
          </Button>
        }
      />

      {!isMember ? (
        <p className="text-sm text-muted-foreground">
          {targetMember.role === "owner" ? "Proprietários" : "Administradores"} têm acesso total à
          residência. Permissões individuais não se aplicam.
        </p>
      ) : (
        <PermissionsForm
          userId={targetUserId}
          permissions={{
            can_manage_tasks: perms?.can_manage_tasks ?? true,
            can_complete_tasks: perms?.can_complete_tasks ?? true,
            can_manage_shopping: perms?.can_manage_shopping ?? true,
            can_purchase_shopping: perms?.can_purchase_shopping ?? true,
            can_manage_events: perms?.can_manage_events ?? true,
          }}
          taskRoomIds={(taskScopes ?? []).map((s) => s.room_id)}
          shoppingCategories={(shopScopes ?? []).map((s) => s.category)}
          rooms={(rooms ?? []).map((r) => ({ id: r.id, name: r.name }))}
          action={setMemberPermissions}
        />
      )}
    </>
  );
}
