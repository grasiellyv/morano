import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, authLinkClass } from "@/features/auth/components/auth-heading";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function Page() {
  return (
    <>
      <AuthHeading title="Recuperar senha">
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </AuthHeading>
      <div className="space-y-5">
        <ForgotPasswordForm />
        <p className="text-muted-foreground text-center text-sm">
          Lembrou?{" "}
          <Link href="/entrar" className={authLinkClass}>
            Voltar para entrar
          </Link>
        </p>
      </div>
    </>
  );
}
