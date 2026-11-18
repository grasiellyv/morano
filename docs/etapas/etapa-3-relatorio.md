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

- **Onboarding (rotas e componentes):** `src/app/onboarding/{page,layout,residencia,comodos,rotina,revisao}/page.tsx`, `src/components/onboarding/timezone-detector.tsx`, `src/features/onboarding/components/{residencia-form,comodos-form,room-selector,rotina-form,task-review-list}.tsx`.
- **Lógica do onboarding:** `src/features/onboarding/actions.ts` (5 Server Actions), `src/features/onboarding/catalog.ts` (catálogo de tarefas), `src/features/onboarding/schemas.ts`, `src/features/onboarding/room-defaults.ts`.
- **Minha Casa:** `src/app/(app)/casa/{page,editar,comodos}/page.tsx`, `src/features/homes/{actions,queries,schemas}.ts`, `src/features/homes/components/{home-form,room-list}.tsx`.
- **Layout do app:** `src/app/(app)/layout.tsx` — agora verifica se o onboarding foi concluído antes de renderizar qualquer tela do app.
- **Testes de unidade:** `src/features/onboarding/{catalog,schemas}.test.ts`.
- **Testes E2E:** `tests/e2e/onboarding.spec.ts` (6 cenários).
- **Utilitários:** `src/lib/telemetry.ts`.

## 3. Dependências adicionadas

Duas bibliotecas de datas, usadas para calcular intervalos de tarefas e fuso horário:

- **date-fns** 4.4.0
- **@date-fns/tz** 1.5.0

Nenhuma outra dependência foi adicionada.

## 4. Testes executados

Rodada final neste ramo:

- **Vitest (unidade): 82 de 82 passaram** (13 arquivos). Inclui 2 novos arquivos desta etapa: catálogo de tarefas (tipos, filtragem, geração de IDs) e schemas de validação do onboarding.
- **TypeScript (tsc): sem erros.**
- **Playwright (E2E): 6 novos testes escritos** cobrindo: redirecionamento de novo usuário, fluxo completo do onboarding, usuário com onboarding concluído não redirecionado, retomada no passo 2, exibição dos dados em `/casa` e adição de cômodo. Os testes E2E desta etapa **não foram executados** nesta sessão — o servidor Next.js (porta 3100) não foi iniciado pelo agente. Para rodá-los: `npm run test:e2e`.
- **pgTAP (banco):** sem migrações novas nesta etapa; os testes do banco da Etapa 2 continuam passando.

## 5. Problemas encontrados e corrigidos

1. **Redirecionamento seguro para usuários com erro de banco:** o guard do `(app)/layout.tsx` só redireciona para `/onboarding` quando tem certeza que o perfil existe e o onboarding não foi concluído. Erro de banco deixa o usuário onde está, em vez de jogá-lo no wizard.
2. **Chip de cômodo vs. lista interna inconsistente:** desmarcar um chip de tipo removia todas as linhas daquele tipo da lista interna, mas o chip ficava marcado em alguns casos de borda. Corrigido unificando o estado interno.
3. **Validação do passo de revisão com zero tarefas:** o botão "Aprovar rotina" ficava habilitado mesmo quando o usuário desmarcava tudo. Adicionada guarda visual e desabilitação do botão.
4. **Título vazio na revisão:** ao editar o título de uma tarefa até ficar vazio e tentar aprovar, a validação do servidor rejeitava. A serialização agora usa o título original como fallback para tarefas incluídas com campo em branco.
5. **`getHomeWithRooms` lançava exceção para usuário sem casa:** a consulta usava `.single()`, que lança erro quando não há linha. Trocado por `.maybeSingle()` para distinguir "ausente" (retorna `null`) de "erro de banco".
6. **Idempotência das Server Actions:** `saveComodos` e `approveRoutine` podiam criar registros duplicados se o usuário clicasse duas vezes antes do redirecionamento. Ambas agora fazem upsert / purga + reinsert de forma idempotente.
7. **`revalidatePath` faltando após mutações:** algumas actions não invalidavam o cache do Next, então a tela de cômodos mostrava dados antigos após adicionar ou remover um cômodo. Adicionado `revalidatePath` em todos os pontos de mutação.
8. **Fuso horário detectado no cliente:** o campo `timezone` não pode vir do servidor (que não conhece o fuso do usuário). Um componente client-side detecta o fuso e injeta um input oculto antes do submit.

## 6. O que falta

**Próximo passo: Etapa 4** — telas de Rotina e Tarefas (ver, marcar como feita, adiar, histórico).

Itens deferidos desta etapa:

- **Convite de membros para a casa:** a estrutura do banco existe desde a Etapa 2, mas o fluxo de convite (envio de e-mail + aceitação) ficou para a Etapa 7 ou 8.
- **Manutenções e equipamentos** aparecem na tela `/casa`, mas o conteúdo real chega nas Etapas 5 e 6.
- **Plano Grátis com limite de cômodos:** o banco já tem o limite (plano grátis = número de cômodos ilimitado no MVP); a mensagem de bloqueio na interface foi deferida.
- **Foto da residência:** campo previsto no banco, interface chega na Etapa 5.
- **E2E não executados em CI:** os 6 testes E2E foram escritos mas precisam de `npm run test:e2e` em ambiente com Next e Supabase rodando para validar.

## 7. Como ver

1. Abra o Docker Desktop e, na pasta do projeto: `npm run db:start`
2. Rode o app: `npm run dev` e abra http://localhost:3000.
3. Crie uma conta em `/cadastro` (ou use uma existente). Após confirmar o e-mail você será levado ao assistente de onboarding.
4. Siga os 4 passos e explore `/casa` ao final.
5. Para rodar os testes unitários: `npx vitest run`. Para os E2E: `npm run test:e2e`.
