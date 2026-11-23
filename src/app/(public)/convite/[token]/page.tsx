import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/features/members/actions";

export const metadata: Metadata = { title: "Aceitar convite — MORANO" };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const { token } = await params;
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();

  // Verifica se o usuário está autenticado
  const { data: authData } = await supabase.auth.getClaims();
  const isAuthenticated = !!authData?.claims?.sub;

  // Busca dados do convite (disponível se autenticado via RLS ou token público)
  // Para convite expirado/revogado/aceito, mostramos mensagem adequada
  const { data: invite } = await supabase
    .from("home_invites")
    .select("invited_email, role, expires_at, status, home_id")
    .eq("token", token)
    .maybeSingle();

  // Sem auth ou sem permissão para ver o convite: mostra tela de login genérica
  if (!invite && !isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Você foi convidado!</h1>
          <p className="text-muted-foreground mt-1">
            Faça login para ver os detalhes e aceitar o convite.
          </p>
        </div>
        <Link
          href={`/entrar?next=/convite/${token}`}
          className="inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Fazer login para aceitar
        </Link>
      </div>
    );
  }

  // Usuário autenticado mas não pode ver o convite pela RLS (não é admin/owner da casa)
  // Nesse caso, deixamos o accept_invite RPC validar — ele fará a verificação server-side
  if (!invite && isAuthenticated) {
    async function handleAcceptBlind() {
      "use server";
      const result = await acceptInvite(token);
      if (result.ok) {
        redirect("/casa/membros");
      } else {
        redirect(`/convite/${token}?error=${encodeURIComponent(result.error ?? "")}`);
      }
    }

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Aceitar convite</h1>
        <p className="text-muted-foreground">
          Clique abaixo para aceitar o convite e entrar na residência.
        </p>
        {errorParam ? (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            {errorParam}
          </p>
        ) : null}
        <form action={handleAcceptBlind}>
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Aceitar convite
          </button>
        </form>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Convite não encontrado</h1>
        <p className="text-muted-foreground">
          Este link de convite é inválido ou já foi utilizado.
        </p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Ir para o MORANO
        </Link>
      </div>
    );
  }

  if (invite.status !== "pending") {
    const statusMsg: Record<string, string> = {
      accepted: "Este convite já foi aceito.",
      revoked: "Este convite foi revogado.",
      expired: "Este convite expirou.",
    };
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Convite indisponível</h1>
        <p className="text-muted-foreground">{statusMsg[invite.status] ?? "Este convite não está mais disponível."}</p>
        {isAuthenticated ? (
          <Link href="/casa" className="text-sm text-primary hover:underline">
            Ir para Minha Casa
          </Link>
        ) : (
          <Link href="/entrar" className="text-sm text-primary hover:underline">
            Fazer login
          </Link>
        )}
      </div>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Convite expirado</h1>
        <p className="text-muted-foreground">Este convite expirou. Peça um novo convite ao administrador da residência.</p>
      </div>
    );
  }

  const ROLE_LABEL: Record<string, string> = {
    admin: "Administrador",
    member: "Membro",
  };

  // Usuário autenticado com visibilidade do convite (admin/owner da casa) — aceita via server action
  async function handleAccept() {
    "use server";
    const result = await acceptInvite(token);
    if (result.ok) {
      redirect("/casa/membros");
    } else {
      redirect(`/convite/${token}?error=${encodeURIComponent(result.error ?? "")}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Aceitar convite</h1>
        <p className="text-muted-foreground mt-1">
          Você foi convidado para entrar em uma residência como{" "}
          <strong>{ROLE_LABEL[invite.role] ?? invite.role}</strong>.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-1 text-sm">
        <p><span className="text-muted-foreground">Papel:</span> {ROLE_LABEL[invite.role] ?? invite.role}</p>
        <p><span className="text-muted-foreground">Expira em:</span> {new Date(invite.expires_at).toLocaleDateString("pt-BR")}</p>
      </div>

      {errorParam ? (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {errorParam}
        </p>
      ) : null}
      <form action={handleAccept}>
        <button
          type="submit"
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Aceitar convite
        </button>
      </form>

      <Link href="/casa" className="block text-sm text-muted-foreground hover:underline">
        Cancelar
      </Link>
    </div>
  );
}
