import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Morano — Dividir responsabilidades. Multiplicar o bem-estar.",
  description: "Organize tarefas, compras e responsabilidades em um só lugar. Compartilhe o cuidado com quem mora com você.",
};

const BENEFITS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Tudo compartilhado",
    description: "Listas, tarefas e compras visíveis para todos da casa.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Uma rotina mais organizada",
    description: "Distribua responsabilidades e acompanhe o que foi feito.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Menos coisas para lembrar",
    description: "Lembretes e histórico: a casa não depende da sua memória.",
  },
];

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: [
          "radial-gradient(ellipse 700px 500px at 90% 0%, rgba(240,184,128,0.32), transparent)",
          "radial-gradient(ellipse 500px 400px at 5% 95%, rgba(214,148,90,0.14), transparent)",
          "linear-gradient(165deg, #FFF9F2 0%, #FBF0E4 45%, #F4E2CE 100%)",
        ].join(", "),
        display: "flex",
        flexDirection: "column",
        padding: "0 20px",
        fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
      }}
    >
      {/* Logo + tagline */}
      <div style={{ paddingTop: "clamp(52px, 11vh, 88px)", textAlign: "center" }}>
        <Logo size="lg" />
        <p style={{ marginTop: 14, fontSize: 14, fontWeight: 400, color: "#725E4F", lineHeight: 1.5, letterSpacing: "0.01em" }}>
          Dividir responsabilidades.
          <br />
          Multiplicar o bem-estar.
        </p>
      </div>

      <div style={{ margin: "clamp(28px, 5vh, 44px) auto 0", width: 32, height: 1.5, borderRadius: 2, background: "rgba(110,70,35,0.18)" }} aria-hidden />

      {/* Conteúdo principal */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: "clamp(24px, 4vh, 36px)", paddingBottom: "clamp(24px, 4vh, 36px)", maxWidth: 420, marginInline: "auto", width: "100%" }}>
        <h1 style={{ fontSize: "clamp(26px, 6.5vw, 34px)", fontWeight: 300, lineHeight: 1.22, letterSpacing: "-0.3px", color: "#2A1B12", textAlign: "center", margin: "0 0 20px" }}>
          A casa não precisa depender da memória de uma pessoa só.
        </h1>

        <p style={{ fontSize: 15, fontWeight: 400, color: "#725E4F", textAlign: "center", lineHeight: 1.65, margin: "0 0 36px" }}>
          Organize tarefas, compras e responsabilidades em um só lugar.
          Compartilhe o cuidado com quem mora com você.
        </p>

        {/* Benefícios */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {BENEFITS.map((b) => (
            <div key={b.title} style={{ display: "flex", alignItems: "flex-start", gap: 14, borderRadius: 16, background: "rgba(255,250,244,0.72)", border: "1px solid rgba(110,70,35,0.10)", padding: "14px 16px", backdropFilter: "blur(4px)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(217,138,43,0.12)", color: "#8B5B30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {b.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#2A1B12", margin: "0 0 3px" }}>{b.title}</p>
                <p style={{ fontSize: 12.5, color: "#725E4F", margin: 0, lineHeight: 1.5 }}>{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ paddingBottom: "clamp(36px, 9vh, 64px)", textAlign: "center", maxWidth: 420, marginInline: "auto", width: "100%" }}>
        <Link href="/cadastro" style={{ display: "block", height: 52, borderRadius: 14, background: "#2A1B12", color: "#FBF0E4", fontSize: 16, fontWeight: 600, lineHeight: "52px", textAlign: "center", textDecoration: "none", letterSpacing: "-0.2px" }}>
          Começar
        </Link>
        <p style={{ marginTop: 18, fontSize: 13.5, color: "#725E4F" }}>
          Já tem uma conta?{" "}
          <Link href="/entrar" style={{ color: "#2A1B12", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}>
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
