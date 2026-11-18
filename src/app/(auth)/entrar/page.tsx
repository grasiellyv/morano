import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, authLinkClass } from "@/features/auth/components/auth-heading";
import { FormMessage } from "@/features/auth/components/form-parts";
import { GoogleButton } from "@/features/auth/components/google-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { LINK_INVALID_MESSAGE } from "@/features/auth/errors";
import { safeNextPath } from "@/lib/auth/safe-next";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Entrar" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const rawNext = first(params.next);
  // Só repassa `next` válido; o servidor valida de novo ao entrar.
  const next = rawNext && safeNextPath(rawNext, "") ? rawNext : undefined;
  const linkError = first(params.erro) === "link";

  return (
    <>
      <AuthHeading title="Entrar">Que bom ter você de volta.</AuthHeading>
      <div className="space-y-5">
        {linkError ? <FormMessage tone="info">{LINK_INVALID_MESSAGE}</FormMessage> : null}
        <SignInForm next={next} />
        {publicEnv.googleAuthEnabled ? (
          <>
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="bg-border h-px flex-1" />
              ou
              <span className="bg-border h-px flex-1" />
            </div>
            <GoogleButton next={next} />
          </>
        ) : null}
        <p className="text-muted-foreground text-center text-sm">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className={authLinkClass}>
            Criar conta
          </Link>
        </p>
      </div>
    </>
  );
}
