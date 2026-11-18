import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, authLinkClass } from "@/features/auth/components/auth-heading";
import { FormMessage } from "@/features/auth/components/form-parts";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { LINK_INVALID_MESSAGE } from "@/features/auth/errors";
import { hasRecoverySession } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Nova senha" };

export default async function Page() {
  // Só quem chegou pelo link de recuperação (sessão com amr "recovery") vê o formulário.
  if (!(await hasRecoverySession())) {
    return (
      <>
        <AuthHeading title="Nova senha" />
        <div className="space-y-5">
          <FormMessage tone="info">{LINK_INVALID_MESSAGE}</FormMessage>
          <Link href="/recuperar-senha" className={authLinkClass}>
            Pedir um novo link
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Nova senha">Escolha uma senha nova para a sua conta.</AuthHeading>
      <ResetPasswordForm />
    </>
  );
}
