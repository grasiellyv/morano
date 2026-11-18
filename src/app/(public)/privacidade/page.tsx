import type { Metadata } from "next";
import { LegalSection, PreliminaryNotice } from "../legal-notice";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function Page() {
  return (
    <article>
      <h1 className="font-heading mb-4 text-3xl font-semibold tracking-tight">
        Política de Privacidade
      </h1>
      <PreliminaryNotice />
      <p className="text-muted-foreground text-sm leading-6">
        Este é um resumo honesto de como o MORANO trata seus dados hoje, durante o beta. Ele não
        substitui o texto jurídico final, que ainda será revisado.
      </p>

      <LegalSection title="O que coletamos">
        <ul>
          <li>
            <strong>Conta:</strong> nome, e-mail, senha (guardada apenas de forma cifrada pelo nosso
            provedor de autenticação) e a data em que você aceitou os termos.
          </li>
          <li>
            <strong>Sua casa:</strong> o que você cadastra — cômodos, tarefas e rotinas,
            equipamentos, manutenções, problemas, listas de compras e anexos (fotos e PDFs).
          </li>
          <li>
            <strong>Uso do produto:</strong> registramos eventos-chave sem conteúdo pessoal (por
            exemplo, &ldquo;tarefa concluída&rdquo; ou &ldquo;equipamento cadastrado&rdquo;, com a
            data e os identificadores da conta e da casa), a data do seu último acesso e, se você
            pedir, seu interesse no plano PRO. Usamos isso só para entender se o produto está
            ajudando.
          </li>
          <li>
            <strong>Notificações:</strong> se você ativar lembretes no aparelho, guardamos o
            endereço técnico de entrega fornecido pelo navegador.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="O que não fazemos">
        <ul>
          <li>Não vendemos nem compartilhamos seus dados para publicidade.</li>
          <li>
            Não usamos rastreadores nem cookies de terceiros. Os únicos cookies são os da sua sessão
            de login.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Onde os dados ficam">
        <p>
          Os dados ficam no Supabase, nosso provedor de banco de dados, autenticação e
          armazenamento. Cada casa só é visível para os seus moradores. Os anexos ficam em um espaço
          privado e são abertos por links temporários.
        </p>
      </LegalSection>

      <LegalSection title="Seus direitos (LGPD)">
        <p>
          Você poderá exportar todos os seus dados (em JSON) e excluir sua conta de verdade, direto
          nas Configurações. Essas opções estão sendo construídas e estarão disponíveis antes do
          lançamento.
        </p>
      </LegalSection>
    </article>
  );
}
