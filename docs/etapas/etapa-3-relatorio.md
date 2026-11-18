# MORANO — Relatório da Etapa 3 (Onboarding e Minha Casa)

**Sua casa. Sob controle.**

Branch: `etapa-3-casa-onboarding`. Esta etapa trouxe a primeira experiência real do app: o assistente de configuração inicial que guia o novo usuário em 4 passos, e a tela "Minha Casa", onde ele pode ver e gerenciar os dados da residência depois que o onboarding está completo.

## 1. O que foi desenvolvido

### Assistente de onboarding (4 passos)

Quando um usuário confirma o e-mail e entra no app pela primeira vez, ele passa por um fluxo guiado antes de chegar à tela principal:

- **Passo 1 — Residência:** nome da casa, tipo de imóvel (apartamento, casa, sobrado…), situação (próprio ou alugado), composição do lar (sozinho, casal, família…) e número de moradores.
- **Passo 2 — Cômodos:** seleção dos ambientes da residência a partir de chips clicáveis (sala, cozinha, quarto, etc.) com opção de adicionar cômodos personalizados.
- **Passo 3 — Rotina:** escolha da intensidade (Leve, Equilibrada ou Detalhada) e quantos minutos por semana o morador quer dedicar à casa.
- **Passo 4 — Revisão:** lista de tarefas sugeridas automaticamente com base nos cômodos e na intensidade escolhida. É possível revisar, ajustar títulos, frequências, minutos e desmarcar tarefas antes de aprovar.

Após a aprovação, o app cria os cômodos e as tarefas da rotina no banco e redireciona o usuário para `/inicio`. Na próxima vez que entrar, o fluxo não aparece mais.

**Retomada automática:** se o usuário fechar o app no meio do fluxo, ao voltar ele continua exatamente do passo onde parou, sem perder nada.

### Minha Casa (`/casa`)

Depois do onboarding, o usuário pode acessar o resumo da residência:

- **Painel principal (`/casa`):** nome da casa, tipo, posse, composição, número de moradores, contagem de cômodos, tarefas da rotina e manutenções (esta última seção já aparece, mas o conteúdo chega na Etapa 5).
- **Gestão de cômodos (`/casa/comodos`):** lista completa dos cômodos com opção de adicionar novos, editar nome e tipo, ou remover.
- **Editar dados (`/casa/editar`):** permite corrigir qualquer informação da residência depois do onboarding.

### Regras de roteamento

- Usuário não autenticado → `/entrar`.
- Usuário autenticado sem onboarding concluído → `/onboarding` → passo atual.
- Usuário autenticado com onboarding concluído → acesso normal ao app; nunca é redirecionado para o wizard novamente.

## 2. Arquivos criados ou modificados

Cerca de 30 arquivos neste ramo. Principais grupos:

- **Telas do assistente de onboarding:** 6 páginas (uma por passo, mais o layout visual do wizard) e 5 componentes de formulário (um por passo, mais o seletor de cômodos por chips).
- **Lógica de salvamento do onboarding:** 5 ações que salvam os dados de cada passo (residência, cômodos, rotina, revisão/aprovação, fuso horário), o catálogo estático de tarefas sugeridas e as regras de validação de cada campo.
- **Telas de Minha Casa:** 3 páginas (painel geral, lista de cômodos, editar dados da residência) e os componentes de formulário correspondentes.
- **Verificação de onboarding em cada página protegida do app:** um arquivo central que, antes de exibir qualquer tela do app, checa se o usuário já completou o assistente — e o manda para lá se não completou.
- **Testes de unidade:** 2 novos arquivos testando o catálogo de tarefas e as regras de validação do onboarding.
- **Testes E2E:** `tests/e2e/onboarding.spec.ts` (6 cenários).
- **Rastreamento de eventos:** um utilitário para registrar eventos de uso (passo iniciado, passo concluído, onboarding aprovado).

## 3. Dependências adicionadas

Duas bibliotecas de manipulação de datas, necessárias para guardar o fuso horário da residência de forma correta:

- **date-fns** 4.4.0 — operações com datas (calcular intervalos, formatar etc.)
- **@date-fns/tz** 1.5.0 — converter horários para o fuso do usuário

Nenhuma outra dependência foi adicionada.

## 4. Testes executados

Rodada final neste ramo:

- **Vitest (unidade): 82 de 82 passaram** (13 arquivos). Inclui 2 novos arquivos desta etapa: catálogo de tarefas (tipos, filtragem, geração de IDs) e schemas de validação do onboarding.
- **TypeScript (tsc): sem erros.**
- **Playwright (E2E): 6 novos testes escritos** cobrindo: redirecionamento de novo usuário, fluxo completo do onboarding, usuário com onboarding concluído não redirecionado, retomada no passo 2, exibição dos dados em `/casa` e adição de cômodo. Os testes E2E desta etapa **não foram executados** nesta sessão — o servidor Next.js (porta 3100) não foi iniciado pelo agente. Para rodá-los: `npm run test:e2e`.
- **pgTAP (banco):** sem migrações novas nesta etapa; os testes do banco da Etapa 2 continuam passando.

## 5. Problemas encontrados e corrigidos

1. **Redirecionamento seguro em caso de falha de banco:** a verificação de onboarding em cada página do app só envia o usuário para o wizard quando tem certeza que o perfil existe e está incompleto. Se houver algum problema de comunicação com o banco, o usuário fica onde estava — sem ser jogado para uma tela errada.
2. **Botão de cômodo desincronizado com a lista:** em alguns casos de borda, clicar num chip para remover um tipo de cômodo deixava o chip visualmente marcado mesmo depois de removido. Corrigido.
3. **Aprovar sem nenhuma tarefa:** o botão "Aprovar rotina" ficava clicável mesmo quando o usuário tinha desmarcado todas as tarefas da lista. Agora ele fica desabilitado e uma mensagem aparece orientando a selecionar ao menos uma.
4. **Título de tarefa apagado na revisão:** se o usuário esvaziasse o campo de título de uma tarefa e tentasse aprovar, o app devolvia erro. Agora o nome original da tarefa é mantido automaticamente como valor padrão.
5. **Erro ao carregar a tela de Minha Casa para usuário novo:** a consulta que busca os dados da casa retornava erro quando o usuário ainda não tinha casa cadastrada, em vez de retornar "sem casa". Corrigido para diferenciar os dois casos e redirecionar corretamente.
6. **Clique duplo criava cômodos ou tarefas em duplicata:** se o usuário clicasse em "Continuar" ou "Aprovar rotina" mais de uma vez (antes do redirecionamento carregar), o app podia gravar os mesmos dados duas vezes. Corrigido para que a segunda gravação substitua a anterior, sem duplicatas.
7. **Tela de cômodos não atualizava após adicionar ou remover:** depois de adicionar ou remover um cômodo, a lista continuava mostrando os dados antigos até o usuário recarregar a página manualmente. Corrigido.
8. **Fuso horário do usuário:** o app não consegue saber o fuso do usuário pelo servidor. Um pequeno detector no navegador captura o fuso e envia junto com os dados da residência no momento do cadastro.

## 6. O que falta

**Próximo passo: Etapa 4** — telas de Rotina e Tarefas (ver, marcar como feita, adiar, histórico).

Itens deferidos desta etapa:

- **Convite de membros para a casa:** a estrutura do banco existe desde a Etapa 2, mas o fluxo de convite (envio de e-mail + aceitação) ficou para a Etapa 7 ou 8.
- **Manutenções e equipamentos** aparecem na tela `/casa`, mas o conteúdo real chega nas Etapas 5 e 6.
- **Limite de cômodos no plano Grátis:** para o MVP, não há limite de cômodos — a estrutura para limitar no futuro (quando houver plano pago) já existe no banco, mas não está ativa.
- **Foto da residência:** campo previsto no banco, interface chega na Etapa 5.
- **E2E não executados em CI:** os 6 testes E2E foram escritos mas precisam de `npm run test:e2e` em ambiente com Next e Supabase rodando para validar.

## 7. Como ver

1. Abra o Docker Desktop e, na pasta do projeto: `npm run db:start`
2. Rode o app: `npm run dev` e abra http://localhost:3000.
3. Crie uma conta em `/cadastro` (ou use uma existente). Após confirmar o e-mail você será levado ao assistente de onboarding.
4. Siga os 4 passos e explore `/casa` ao final.
5. Para rodar os testes unitários: `npx vitest run`. Para os E2E: `npm run test:e2e`.
