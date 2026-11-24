import type { Metadata } from "next";
import { KeyRound, Plane } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getMyAbsence } from "@/features/absence/queries";
import { setAbsence, clearAbsence } from "@/features/absence/actions";
import { AbsenceForm } from "@/features/absence/components/absence-form";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { UpdateNameForm } from "@/features/auth/components/update-name-form";
import { AVATAR_PALETTE, getInitial } from "@/features/members/avatar-palette";
import { PageHeader } from "@/components/feedback/page-header";

export const metadata: Metadata = { title: "Minha conta" };

const card: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--card)",
  boxShadow: "var(--shadow)",
  padding: "14px 16px",
};

function SectionTitle({ id, icon, title, hint }: { id: string; icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: "var(--secondary)" }}
      >
        {icon}
      </span>
      <div>
        <h2 id={id} className="text-[15px] font-semibold leading-tight">{title}</h2>
        {hint ? <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{hint}</p> : null}
      </div>
    </div>
  );
}

/**
 * "Minha conta": tudo que é da PESSOA em um só lugar. O que é da casa (dados,
 * moradores, cômodos, animais…) fica na aba Casa; não há mais "configurações"
 * separadas nem link duplicado entre as duas.
 */
export default async function Page() {
  const user = await requireUser();
  const supabase = await createClient();

  const [currentAbsence, profileResult] = await Promise.all([
    getMyAbsence(supabase, user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const fullName = profileResult.data?.full_name ?? null;
  const palette = AVATAR_PALETTE[0]!;

  return (
    <>
      <PageHeader title="Minha conta" />

      {/* Identidade */}
      <section aria-label="Seus dados" className="mb-6">
        <div className="mb-4 flex flex-col items-center gap-3 pt-1">
          <div
            aria-hidden
            className="flex items-center justify-center rounded-full font-semibold"
            style={{ width: 72, height: 72, fontSize: 28, background: palette.bg, color: palette.color }}
          >
            {getInitial(fullName)}
          </div>
          <div className="text-center">
            <p className="font-title" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}>{fullName ?? "Sem nome"}</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{user.email}</p>
          </div>
        </div>
        <div style={card}>
          <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500, marginBottom: 8 }}>Nome</p>
          <UpdateNameForm currentName={fullName} />
        </div>
      </section>

      {/* Ausência */}
      <section aria-labelledby="ausencia" className="mb-6">
        <SectionTitle
          id="ausencia"
          icon={<Plane size={16} aria-hidden />}
          title="Modo ausência"
          hint="Pausa as tarefas que seriam suas enquanto você estiver fora."
        />
        <div style={card}>
          <AbsenceForm
            currentAbsence={currentAbsence}
            setAbsenceAction={setAbsence}
            clearAbsenceAction={clearAbsence}
          />
        </div>
      </section>

      {/* Segurança */}
      <section aria-labelledby="seguranca" className="mb-6">
        <SectionTitle id="seguranca" icon={<KeyRound size={16} aria-hidden />} title="Alterar senha" />
        <div style={card}>
          <ChangePasswordForm />
        </div>
      </section>

      <section>
        <SignOutButton />
      </section>
    </>
  );
}
