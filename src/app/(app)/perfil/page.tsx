import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feedback/page-header";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { UpdateNameForm } from "@/features/auth/components/update-name-form";

export const metadata: Metadata = { title: "Perfil" };

const AVATAR_PALETTE = [
  { bg: "#EBD5BE", color: "#6B3A17" },
  { bg: "#F3CFCF", color: "#8A2F3A" },
  { bg: "#D5DEEA", color: "#2C4A6E" },
  { bg: "#D8E8D6", color: "#2D5428" },
  { bg: "#E8D5EA", color: "#5A2D6B" },
];

function getInitial(name: string | null, fallback = "?"): string {
  return (name ?? fallback).charAt(0).toUpperCase();
}

export default async function Page() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name ?? null;
  const palette = AVATAR_PALETTE[0]!;

  return (
    <>
      <PageHeader title="Perfil" />

      {/* Avatar + nome */}
      <section className="mb-5 flex flex-col items-center gap-3 pt-2">
        <div
          style={{
            width: 72, height: 72, borderRadius: 36,
            background: palette.bg, color: palette.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 600,
          }}
          aria-hidden
        >
          {getInitial(fullName)}
        </div>
        <div className="text-center">
          <p style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}>
            {fullName ?? "Sem nome"}
          </p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
            {user.email}
          </p>
        </div>
      </section>

      {/* Nome */}
      <section
        className="mb-3"
        style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow)", padding: "14px 16px" }}
      >
        <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500, marginBottom: 8 }}>Nome</p>
        <UpdateNameForm currentName={fullName} />
      </section>

      {/* Links rápidos */}
      <section className="space-y-2">
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 no-underline"
          style={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow)", padding: "13px 14px", color: "var(--foreground)" }}
        >
          <span className="flex-1 text-sm font-medium">Configurações da casa</span>
          <ChevronRight size={16} strokeWidth={1.8} style={{ color: "var(--muted-foreground)" }} />
        </Link>

        <Link
          href="/casa/membros"
          className="flex items-center gap-3 no-underline"
          style={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow)", padding: "13px 14px", color: "var(--foreground)" }}
        >
          <span className="flex-1 text-sm font-medium">Moradores da casa</span>
          <ChevronRight size={16} strokeWidth={1.8} style={{ color: "var(--muted-foreground)" }} />
        </Link>
      </section>

      {/* Sign out */}
      <section className="mt-6">
        <SignOutButton />
      </section>
    </>
  );
}
