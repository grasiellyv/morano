import type { Metadata } from "next";
import { PageHeader } from "@/components/feedback/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getMyAbsence } from "@/features/absence/queries";
import { setAbsence, clearAbsence } from "@/features/absence/actions";
import { AbsenceForm } from "@/features/absence/components/absence-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function Page() {
  const user = await requireUser();
  const supabase = await createClient();
  const currentAbsence = await getMyAbsence(supabase, user.id);

  return (
    <>
      <PageHeader title="Configurações" />

      <section className="mb-8">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">E-mail:</span> {user.email}
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold">Modo ausência</h2>
        <AbsenceForm
          currentAbsence={currentAbsence}
          setAbsenceAction={setAbsence}
          clearAbsenceAction={clearAbsence}
        />
      </section>
    </>
  );
}
