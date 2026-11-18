import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, authLinkClass } from "@/features/auth/components/auth-heading";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function Page() {
  return (
    <>
      <AuthHeading title="Criar conta">
        Organize a rotina, a manutenção e as compras da casa.
      </AuthHeading>
      <div className="space-y-5">
        <SignUpForm />
        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{" "}
          <Link href="/entrar" className={authLinkClass}>
            Entrar
          </Link>
        </p>
      </div>
    </>
  );
}
