import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, authLinkClass } from "@/features/auth/components/auth-heading";
import { SIGN_UP_NEUTRAL_MESSAGE } from "@/features/auth/errors";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default function Page() {
  return (
    <>
      <AuthHeading title="Confirme seu e-mail">{SIGN_UP_NEUTRAL_MESSAGE}</AuthHeading>
      <p className="text-muted-foreground text-sm">
        Não chegou? Confira a caixa de spam ou{" "}
        <Link href="/entrar" className={authLinkClass}>
          tente entrar
        </Link>{" "}
        para receber o link de novo.
      </p>
    </>
  );
}
