import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, PreliminaryNotice } from "../legal-notice";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function Page() {
  return (
    <article>
      <h1 className="font-heading mb-4 text-3xl font-semibold tracking-tight">Termos de Uso</h1>
      <PreliminaryNotice />
      <p className="text-muted-foreground text-sm leading-6">
        Um resumo do combinado entre você e o MORANO durante o beta. Ele não substitui o texto
        jurídico final, que ainda será revisado.
      </p>

      <LegalSection title="O serviço">
        <p>
          O MORANO ajuda a organizar a rotina, a manutenção e as compras da sua casa. Durante o
          beta, os recursos podem mudar e pode haver instabilidades.
        </p>
      </LegalSection>

      <LegalSection title="Sua conta">
        <ul>
          <li>Use um e-mail seu e mantenha sua senha em segurança.</li>
          <li>O que você cadastra continua sendo seu.</li>
          <li>Não use o serviço para atividades ilegais ou para prejudicar outras pessoas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Planos">
        <p>
          Durante o beta, novas contas recebem o plano PRO sem custo. Avisaremos com antecedência
          antes de qualquer cobrança; nada será cobrado sem a sua confirmação.
        </p>
      </LegalSection>

      <LegalSection title="Privacidade">
        <p>
          Veja quais dados coletamos e por quê na{" "}
          <Link
            href="/privacidade"
            className="focus-visible:ring-ring rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-2"
          >
            Política de Privacidade
          </Link>
          .
        </p>
      </LegalSection>
    </article>
  );
}
