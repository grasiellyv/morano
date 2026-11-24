import Link from "next/link";
import type { Metadata } from "next";
import { BenefitsCarousel } from "@/components/welcome/benefits-carousel";
import { HeroIllustration } from "@/components/welcome/hero-illustration";
import "@/components/welcome/welcome.css";

export const metadata: Metadata = {
  title: "Morano — Dividir responsabilidades. Multiplicar o bem-estar.",
  description: "Organize tarefas, compras e responsabilidades em um só lugar. Compartilhe o cuidado com quem mora com você.",
};

/** Tela de boas-vindas — DESIGN.md §9, Opção C. */
export default function LandingPage() {
  return (
    <main className="welcome">
      <div className="welcome-head">
        <div className="welcome-logo a-in" role="img" aria-label="Morano">
          morano<i>.</i>
        </div>
        <p className="welcome-tagline a-in" style={{ animationDelay: ".05s" }}>
          <span>Dividir responsabilidades.</span> <span>Multiplicar o bem-estar.</span>
        </p>
        <h1 className="welcome-title a-in" style={{ animationDelay: ".1s" }}>
          A casa não precisa depender da memória de uma pessoa só.
        </h1>
        <p className="welcome-lede a-in" style={{ animationDelay: ".15s" }}>
          Organize tarefas, compras e responsabilidades em um só lugar. Compartilhe o cuidado com quem mora com você.
        </p>
      </div>

      <div className="welcome-art">
        <HeroIllustration />
      </div>

      <div className="welcome-foot">
        <BenefitsCarousel />
        <Link href="/cadastro" className="welcome-cta a-in" style={{ animationDelay: "2.1s" }}>
          Começar
        </Link>
        <p className="welcome-login a-in" style={{ animationDelay: "2.3s" }}>
          Já tem uma conta? <Link href="/entrar">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
