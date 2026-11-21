import type { Metadata } from "next";
import { PageHeader } from "@/components/feedback/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getMyAbsence } from "@/features/absence/queries";
import { setAbsence, clearAbsence } from "@/features/absence/actions";
import { AbsenceForm } from "@/features/absence/components/absence-form";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { UpdateNameForm } from "@/features/auth/components/update-name-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function Page() {
  const user = await requireUser();
  const supabase = await createClient();

  const [currentAbsence, profileResult] = await Promise.all([
    getMyAbsence(supabase, user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const fullName = profileResult.data?.full_name ?? null;

  return (
    <>
      <PageHeader title="Configurações" />

      <section className="mb-8 space-y-3">
        <div className="text-sm">
          <span className="text-muted-foreground">E-mail: </span>
          <span className="font-medium">{user.email}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Nome: </span>
          <UpdateNameForm currentName={fullName} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold">Modo ausência</h2>
        <AbsenceForm
          currentAbsence={currentAbsence}
          setAbsenceAction={setAbsence}
          clearAbsenceAction={clearAbsence}
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-base font-semibold">Alterar senha</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <ChangePasswordForm />
        </div>
      </section>
    </>
  );
}
