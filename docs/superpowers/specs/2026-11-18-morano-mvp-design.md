# MORANO — Design do MVP 1.0

Data: 2026-11-18 · Status: aguardando aprovação do dono

Este documento consolida o "Master Prompt" do MORANO com as decisões tomadas na conversa de brainstorming. Onde algo é **decisão do dono do produto**, está marcado como tal; onde é **escolha técnica minha**, está marcado como "(decisão técnica)" e pode ser revisto.

---

## 1. Intenção e porquê

O MORANO é uma **aposta de negócio**: um SaaS freemium de gestão residencial ("Sua casa. Sob controle.") que centraliza rotina, cômodos, equipamentos, manutenção, problemas e compras, conectando essas informações entre si. O sucesso inicial é ter pessoas reais usando o app semanalmente e sinais de que pagariam pelo PRO.

Público: quem mora sozinho, casais, famílias, inquilinos e proprietários. A experiência se adapta ao perfil informado no onboarding.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos do MVP 1.0** (escopo completo do Master Prompt, seção 14 — decisão do dono):
autenticação, onboarding com rotina sugerida, residência e cômodos, dashboard, tarefas com recorrência e histórico, calendário, equipamentos (com fotos e documentos), manutenções (com custos e anexos), problemas residenciais, lista de compras, configurações, responsividade/PWA instalável, estrutura freemium sem cobrança real.

**Não-objetivos (ficam para 1.5 / 2.0, conforme o próprio prompt):** notificações push (só a tabela é criada), compartilhamento ativo da casa com convites (a arquitetura suporta, a UI não existe), relatórios exportáveis, OCR, assistente com IA, previsão de consumo, integrações, marketplace, cobrança real, app nativo.

> Exceção trazida para o MVP: **upload de fotos e documentos**, porque equipamentos e manutenções do MVP exigem fotos/manuais/comprovantes.

**Anti-objetivos (fracasso mesmo que "funcione"):**
- Parecer um app de tarefas genérico ou um painel administrativo cheio de cards.
- Perder histórico (conclusões, manutenções, problemas resolvidos) por qualquer edição ou exclusão.
- Criar tarefas sem o usuário revisar e aprovar.
- Inventar intervalos técnicos de manutenção.
- Permitir que um usuário veja dados de outra casa, ou libere o PRO pelo navegador.
- Mostrar dado fictício como real (dados de demonstração sempre rotulados).
- Botões sem função.

## 3. Restrições

- Stack definida pelo dono: Next.js (App Router) + React + TypeScript strict + Tailwind + shadcn/ui + Lucide; Supabase (Postgres, Auth, Storage, @supabase/ssr); React Hook Form + Zod; date-fns; Vitest + Playwright; Vercel. Versões: a estável mais recente no início da Etapa 1, conferida na documentação oficial.
- Somente pt-BR e BRL no MVP; strings centralizadas para tradução futura (decisão técnica).
- Ambiente: Windows, Node 26, Supabase CLI 3.2. **Docker Desktop precisa ser instalado** (pelo dono) para rodar Supabase local — pré-requisito da Etapa 2.
- Trabalho por etapas com aprovação do dono após cada uma, com o relatório pedido no prompt (o que foi feito, arquivos, dependências, testes, problemas, o que falta).

## 4. Abordagens consideradas

### 4.1 Lançamento
- A) Beta cedo com núcleo enxuto · B) MVP completo e depois beta · C) Beta fechado durante o desenvolvimento.
- Recomendei A; o dono depois definiu que o MVP deve conter **tudo do prompt**. **Resultado: MVP 1.0 completo, beta aberto ao final da Etapa 10.** A ordem das etapas (seção 12) entrega o núcleo de uso diário cedo, para que o dono possa usar o app pessoalmente enquanto o resto é construído.

### 4.2 Recorrência (escolhida: A)
- **A) Ocorrências materializadas numa janela móvel** — cada ocorrência futura (~8 semanas) é uma linha; restrição única impede duplicidade; concluir/adiar mexe só naquela linha. Consultas de hoje/atrasadas/calendário simples; custo: mais linhas e regra cuidadosa ao editar a recorrência. **Escolhida pelo dono.**
- B) Calcular na hora a partir da regra e guardar só exceções — leve, mas "atrasadas" e RLS ficam complexas e frágeis com fuso.
- C) Gerar a próxima só ao concluir — simples, mas sem calendário futuro e tarefas esquecidas somem.

### 4.3 Login (recomendação aceita)
Google + e-mail/senha (com confirmação de e-mail e recuperação de senha). Apple fica para quando houver app iOS nativo. Link mágico não como método único (quebra o fluxo no PWA). Em produção, SMTP próprio (recomendado: Resend) porque o SMTP padrão do Supabase tem limite muito baixo.

### 4.4 Identidade visual (decisões do dono, via mockups)
- **Logotipo: direção B** — `morano.` em Manrope SemiBold minúsculo, tracking apertado (~-0.035em), com o ponto final em Caramelo (#B69B79). Ícone do app: `m.` em Off-white sobre Sálvia, ponto em Grafite.
- **Dashboard: direção A, "Resumo em texto"** — data, saudação, uma frase-resumo gerada a partir de dados reais ("Hoje são 5 tarefas (cerca de 50 min). 1 está atrasada e a garantia da geladeira vence em 12 dias."), barra fina de progresso, lista "Hoje", seção "Atenção na casa" em linhas (problemas, manutenções próximas, compras), e resumo semanal. Mínimo de cards.
- Mockups de referência: `.superpowers/brainstorm/*/content/logo.html` e `dashboard.html`.

## 5. Experiência e navegação

- **Mobile:** barra inferior com 5 itens — Início, Rotina, Casa, Manutenção, Compras. Perfil e configurações ficam no avatar do topo. (Ajuste aprovado: 6 itens não cabem bem.)
- **Desktop:** barra lateral com os mesmos itens + Perfil/Configurações no rodapé da barra.
- Rotas (pt-BR): `/inicio`, `/rotina`, `/casa`, `/manutencao`, `/compras`, `/configuracoes`, `/onboarding`, `/entrar`, `/cadastro`.
- **Problemas moram em Manutenção** (aba "Problemas" ao lado de "Serviços"); a página de cada cômodo e de cada equipamento mostra os problemas/manutenções/tarefas ligados a ele, com atalho para criar. (Ajuste aprovado.)
- Toda tela tem: estado de carregamento, estado vazio com ação útil, mensagem de sucesso/erro, confirmação para ações destrutivas.
- Adicionar item de compra: campo sempre visível no topo da lista; Enter adiciona com quantidade 1 e categoria inferida do histórico do próprio usuário (se já comprou "detergente" como Limpeza, sugere Limpeza; senão "Outros"). Edição de quantidade/unidade/categoria é opcional, depois. (decisão técnica)
- Acessibilidade: contraste AA (o Sálvia #879080 sobre Off-white não atinge AA para texto pequeno — usar um tom mais escuro derivado para texto auxiliar; Sálvia original fica para elementos gráficos), foco visível, navegação por teclado, alvos de toque ≥ 44px.
- Tema escuro: **não no MVP** (decisão técnica; tokens de cor preparados para isso).

### 5.1 Integrações entre módulos (o diferencial)
- Tarefa pode ligar-se a um **cômodo** e, opcionalmente, a um **equipamento**.
- Problema pode ligar-se a cômodo e/ou equipamento; dele o usuário pode **agendar uma manutenção** (vínculo `issue_id`) ou **adicionar um item à lista de compras** (ex.: "lâmpada", vínculo `issue_id`).
- Manutenção concluída pode resolver o problema de origem (pergunta ao usuário).
- Equipamento mostra garantia, manutenções, problemas, tarefas e anexos num só lugar.
- Dashboard cruza tudo: tarefas de hoje/atrasadas, garantias vencendo (≤ 30 dias), manutenções agendadas (≤ 14 dias), problemas abertos, itens pendentes.

## 6. Onboarding

Fluxo: boas-vindas → cadastro/login → tipo de imóvel → próprio/alugado → composição da casa e nº de moradores → cômodos (pré-selecionados conforme o tipo de imóvel, editáveis) → tempo disponível por semana → preferência de nível (Leve / Equilibrada / Detalhada) → **rotina sugerida** → revisão (cada tarefa pode ser editada, removida ou ter frequência alterada) → aprovar → dashboard.

- Etapas opcionais têm "Pular"; obrigatório apenas: nome da casa (com valor padrão "Minha casa") e fuso horário (detectado do navegador, confirmável).
- O progresso do onboarding é salvo por etapa; fechar o app e voltar continua de onde parou.
- **Sugestões vêm de um catálogo estático em código** (não IA): modelos de tarefas de limpeza/organização por tipo de cômodo, cada um com frequência e minutos estimados por nível. O nível e o tempo disponível filtram o catálogo. Nada de manutenção técnica no catálogo. Nada é gravado antes do "Aprovar".
- `profiles.onboarding_completed` controla o redirecionamento.

## 7. Arquitetura

- **Leitura:** Server Components consultam o Supabase com a sessão do usuário (cliente servidor do @supabase/ssr). RLS sempre ativa.
- **Escrita:** Server Actions por feature; cada uma valida a entrada com Zod, verifica a sessão, aplica regras de negócio e grava. RLS é a última barreira, não a única.
- **Rotas de API:** só quando necessário (futuro webhook de pagamento; callback OAuth).
- **Sessão / rotas privadas:** `proxy.ts` (antigo middleware, conforme a versão do Next) renova a sessão e redireciona não autenticados; layouts privados verificam de novo no servidor (`getUser`/claims verificadas, nunca só o cookie).
- **Service Role Key:** usada **apenas** em código servidor, num único módulo `server-only`, para: exclusão de conta (LGPD) e futuros webhooks. Nunca em variável `NEXT_PUBLIC_*`.
- **Regras de negócio puras** (recorrência, limites do plano, frase-resumo do dashboard, catálogo do onboarding) ficam em módulos TypeScript sem dependência de UI ou banco, cobertos por Vitest.
- **Tipos do banco** gerados pelo Supabase CLI (`supabase gen types`), versionados.
- **Fuso horário:** cada casa tem `timezone` (IANA, ex. `America/Sao_Paulo`). "Hoje" sempre é calculado no fuso da casa (date-fns + `@date-fns/tz`). Tarefas são de granularidade **dia** (campo `date`), não horário — elimina a maior parte dos problemas de horário de verão. Instantes de eventos (`completed_at`, `resolved_at`) são `timestamptz`.

### 7.1 Estrutura de pastas (adaptada do prompt)

```text
morano/
├── public/ (icons/, images/)
├── src/
│   ├── app/
│   │   ├── (public)/            # landing simples, privacidade, termos
│   │   ├── (auth)/entrar, cadastro, recuperar-senha, auth/callback
│   │   ├── onboarding/
│   │   ├── (app)/inicio, rotina, casa, manutencao, compras, configuracoes
│   │   ├── manifest.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                  # shadcn/ui (customizados com os tokens MORANO)
│   │   ├── layout/              # app shell, bottom nav, sidebar, header
│   │   └── brand/               # logotipo, ícone
│   ├── features/
│   │   ├── auth/ onboarding/ homes/ rooms/ tasks/ appliances/
│   │   ├── maintenance/ issues/ shopping/ attachments/ dashboard/ billing/ account/
│   │   │   └── (cada uma) components/ actions.ts queries.ts schemas.ts rules/*.ts
│   ├── lib/
│   │   ├── supabase/ (server.ts, client.ts, admin.ts [server-only], proxy.ts)
│   │   ├── dates/ (fuso da casa, "hoje", formatação pt-BR)
│   │   └── utils/
│   ├── types/database.ts        # gerado
│   └── constants/ (planos, categorias, tipos de cômodo, textos)
├── supabase/ migrations/ tests/ (pgTAP) seed.sql config.toml
├── tests/ e2e/ (Playwright)
├── .env.example  README.md
```

Mudança em relação ao prompt: componentes de domínio, actions, queries e schemas ficam **dentro de cada feature** (em vez de `components/routine`, `services/`, `lib/validations` separados) para manter cada domínio coeso. `components/` guarda só o que é compartilhado.

## 8. Banco de dados

Convenções (todas as tabelas): `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at` com trigger nas tabelas editáveis, FKs com índice, enums Postgres para status/tipos, migrations versionadas em `supabase/migrations`.

### 8.1 Tabelas

**profiles** — `id` (= auth.users.id, cascade), `full_name`, `avatar_url`, `timezone` (padrão para novas casas), `onboarding_step`, `onboarding_completed`, `marketing_opt_in` (default false), timestamps. Criado por trigger no cadastro.

**homes** — `name`, `property_type` (apartamento, casa, sobrado, studio/kitnet, outro), `ownership_type` (proprio, alugado, outro), `household_type` (sozinho, casal, familia, compartilhada, outro), `resident_count`, `available_minutes_per_week`, `routine_level` (leve, equilibrada, detalhada), **`timezone`**, `created_by`, timestamps.

**home_members** — `home_id`, `user_id`, `role` (owner, admin, member), `created_at`. `unique(home_id, user_id)`. Trigger cria o owner ao criar a casa.

**rooms** — `home_id`, `name`, `room_type` (sala, cozinha, quarto, banheiro, lavanderia, escritorio, varanda, garagem, outro), `position`, timestamps.

**tasks** — `home_id`, `room_id` (null on delete), `appliance_id` (null on delete), `title`, `description`, `priority` (baixa, media, alta), `estimated_minutes`, `status` (active, paused, archived), `source` (manual, onboarding), `created_by`, timestamps.

**routines** (configuração de recorrência, 1:1 com task, `unique(task_id)`) — `frequency_type` (once, daily, weekly, biweekly, monthly, custom), `interval_value` (int ≥ 1), `interval_unit` (day, week, month — para custom), `weekdays smallint[]` (0–6, para weekly/biweekly/custom semanal), `month_day` (1–31; dia inexistente = último dia do mês), `start_date date`, `end_date date null`, `generated_until date`, `is_active`, timestamps.
Mudança: `next_due_at` do prompt vira `generated_until` (até onde a janela foi gerada); a próxima ocorrência é consultada em `task_occurrences`.

**task_occurrences** — `task_id` (cascade), `home_id` (denormalizado para RLS/índices), **`original_date date`** (data que a regra gerou), **`scheduled_for date`** (data efetiva; difere quando adiada), `status` (pending, completed, skipped, missed), `completed_at`, `completed_by`, `notes`, timestamps.
- **`unique(task_id, original_date)`** — impede duplicidade mesmo se a geração rodar duas vezes ou em paralelo (`insert … on conflict do nothing`).
- Índices: `(home_id, scheduled_for, status)`, `(task_id, scheduled_for)`.

**appliances** — `home_id`, `room_id` (null on delete), `name`, `category` (geladeira, maquina_lavar, ar_condicionado, …, outro), `brand`, `model`, `serial_number`, `purchase_date`, `warranty_until`, `notes`, `archived_at`, timestamps.

**maintenance_records** — `home_id`, `appliance_id` (null = manutenção geral da casa), `room_id`, `issue_id` (origem opcional), `title`, `description`, `status` (scheduled, completed, cancelled), `scheduled_for date`, `completed_at`, `cost_cents integer` (BRL, nunca float), `provider_name`, `notes`, `created_by`, timestamps.

**home_issues** — `home_id`, `room_id`, `appliance_id`, `title`, `description`, `status` (open, in_progress, resolved), `reported_at date`, `resolved_at`, `created_by`, timestamps.

**issue_events** (histórico do problema) — `issue_id` (cascade), `home_id`, `event_type` (created, status_changed, note, maintenance_linked), `from_status`, `to_status`, `note`, `created_by`, `created_at`. Gravado por trigger em mudança de status + manualmente para notas.

**shopping_items** — `home_id`, `name`, `category` (limpeza, higiene, cozinha, lavanderia, alimentacao, outros), `quantity numeric(10,2)` default 1, `unit` (un, kg, g, L, ml, pacote, caixa), `is_purchased`, `purchased_at`, `purchased_by`, `issue_id` (origem opcional), `created_by`, timestamps. Histórico = itens comprados; "comprar de novo" cria um novo item pendente.

**attachments** — `home_id`, **`appliance_id` | `maintenance_id` | `issue_id`** (FKs explícitas, cascade, com `CHECK (num_nonnulls(appliance_id, maintenance_id, issue_id) = 1)`), `kind` (photo, document), `file_path`, `file_name`, `mime_type`, `size_bytes`, `uploaded_by`, `created_at`.
Mudança: em vez do polimorfismo `entity_type/entity_id`, FKs explícitas — o banco garante integridade e a autorização é simples (o prompt pediu para não fazer polimorfismo sem definir autorização). Trigger confirma que a entidade pertence ao mesmo `home_id`.

**push_subscriptions** — `user_id`, `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `created_at`, `last_used_at`. Só estrutura no MVP.

**subscriptions** — `user_id`, `plan` (free, pro), `status` (active, trialing, past_due, canceled), `provider` (none, beta_grant, stripe, mercadopago), `provider_customer_id`, `provider_subscription_id`, `current_period_start`, `current_period_end`, timestamps. Usuário **só lê a própria linha**; escrita só via service role (futuros webhooks). Sem linha = free.

**account_deletion_log** (opcional, mínimo) — registra data e id anônimo da exclusão para comprovação LGPD, sem dados pessoais.

### 8.2 Políticas de exclusão (preservar histórico)
- Excluir **tarefa** com ocorrências concluídas → é **arquivada** (some da rotina, histórico fica); sem histórico → exclusão real. A UI explica isso.
- Excluir **cômodo** → tarefas/equipamentos/problemas ficam "sem cômodo" (set null), com confirmação mostrando quantos itens são afetados.
- **Equipamento** → arquivado por padrão; exclusão definitiva remove anexos e desvincula manutenções (que permanecem no histórico com o título).
- **Casa** → só o owner; cascata total, com confirmação digitando o nome.
- **Conta** → exclui usuário no Auth (service role), cascata de profile/memberships; casas onde é único owner são excluídas com todos os dados e arquivos do Storage.

## 9. Recorrência — regras

1. Criar tarefa = criar `tasks` + `routines` + gerar ocorrências de `start_date` até `hoje + 56 dias` (no fuso da casa), numa transação (função Postgres `security invoker` ou action com RPC).
2. Cálculo das datas em **TypeScript puro** (`features/tasks/rules/recurrence.ts`), testado com Vitest; a gravação usa `on conflict (task_id, original_date) do nothing`.
3. **Extensão da janela:** ao carregar Início/Rotina, uma verificação barata estende tarefas cuja `generated_until < hoje + 28` (sem cron e sem service role no MVP — decisão técnica; um cron diário pode ser acrescentado depois).
4. **Concluir:** `status = completed`, `completed_at`, `completed_by`. Desfazer é permitido no mesmo dia.
5. **Adiar:** altera só `scheduled_for` daquela ocorrência (`original_date` não muda); a próxima ocorrência da regra não é afetada. Não é possível adiar para depois da próxima ocorrência da mesma tarefa (evita duas na mesma data efetiva — o usuário é orientado a "pular" em vez disso).
6. **Pular:** `status = skipped`, conta no histórico.
7. **Atrasadas sem acúmulo:** para tarefas recorrentes, só a ocorrência pendente **mais recente** já vencida aparece como atrasada; as anteriores viram `missed` quando uma nova vence (evita 30 "lavar louça" atrasados). Tarefas únicas ficam atrasadas até serem resolvidas. (decisão técnica de produto)
8. **Editar a regra:** apaga somente ocorrências **futuras, pendentes e não adiadas** (`scheduled_for = original_date`, `>= hoje`) e regera a partir da nova regra. Concluídas, puladas, perdidas e adiadas ficam intactas.
9. **Mensal no dia 31** → último dia do mês. **Quinzenal** = a cada 2 semanas nos dias da semana escolhidos.
10. **Mudar o fuso da casa** não move datas já geradas (são datas locais), só muda o cálculo de "hoje".
11. Testes obrigatórios: virada de mês/ano, fevereiro/bissexto, dia 31, quinzenal, fuso com e sem horário de verão (ex. `America/Sao_Paulo` histórico, `Europe/Lisbon`), usuário em fuso diferente da casa, geração duplicada concorrente, edição de regra preservando histórico.

## 10. Segurança e privacidade

- **RLS ativa em todas as tabelas.** Funções auxiliares `security definer` com `search_path` fixo: `is_home_member(home_id)`, `has_home_role(home_id, roles[])` — evitam recursão em `home_members`.
- Conteúdo da casa (rooms, tasks, routines, occurrences, appliances, maintenance, issues, events, shopping, attachments): **select/insert/update/delete para membros**; `with check` garante que `home_id` é de uma casa da qual o usuário é membro e que FKs (room, appliance, issue) pertencem à **mesma casa** (trigger de consistência).
- `homes`: update por owner/admin, delete só owner. `home_members`: leitura pelos membros; gestão só owner/admin (no MVP não há UI de convites).
- `profiles`: cada um lê/edita o próprio.
- `subscriptions`: só leitura da própria; sem políticas de escrita para `authenticated`.
- **Storage:** bucket privado `home-files`; caminho `{home_id}/{attachment_id}/{nome-sanitizado}`; políticas do `storage.objects` checam `is_home_member((storage.foldername(name))[1]::uuid)`. Bucket com limite de tamanho (10 MB) e MIME permitidos (JPEG, PNG, WebP, HEIC, PDF); validação repetida no servidor; arquivos servidos por **signed URLs** de curta duração. Fotos redimensionadas no cliente antes do upload (decisão técnica).
- **Limites do plano no banco:** triggers `before insert` verificam limites (ex. nº de equipamentos, anexos) consultando o plano do owner da casa — o navegador não consegue burlar. As mesmas regras existem em TypeScript para a UI mostrar o aviso antes.
- Testes de RLS com **pgTAP** (`supabase test db`): usuário A não lê/grava nada da casa de B, inclusive via FKs cruzadas e Storage.
- Erros: mensagens amigáveis em pt-BR para o usuário; detalhes só no log do servidor; nunca vazar SQL/stack.
- Headers de segurança (CSP básica, etc.) no `next.config`.
- **LGPD:** página de Política de Privacidade e Termos (textos-base a revisar por advogado — não sou substituto jurídico), consentimento explícito no cadastro, **exportar meus dados** (JSON), **excluir minha conta** (real, com confirmação), nenhum rastreamento de terceiros no MVP além de analytics sem cookies se o dono quiser (decidir na Etapa 10).

## 11. Freemium

- Planos em `constants/plans.ts` e espelhados numa função SQL `plan_limits(plan)`.
- **Proposta de limites do Free** (hipóteses, ajustáveis numa linha): 1 casa · 40 tarefas ativas · 5 equipamentos · histórico visível de 90 dias (dados antigos **nunca** são apagados, só ocultados) · fotos/documentos e relatórios só no PRO.
- **Beta:** todo usuário recebe `subscriptions` com `plan = pro`, `provider = beta_grant`, `current_period_end` definido — testa o caminho real de verificação de plano sem cobrança.
- **Fim do PRO (decisão do dono — opção A):** quando o PRO termina (fim do beta ou cancelamento), **nada é apagado nem bloqueado para leitura ou edição**. O usuário só não consegue *criar* novos itens acima dos limites do Free; fotos e documentos existentes continuam visíveis e baixáveis, novos uploads exigem PRO. Isso é aplicado nos triggers `before insert`, nunca em leitura/RLS de select.
- **Duração do PRO do beta** (decisão técnica, a confirmar): `current_period_end` = lançamento público + 90 dias, com aviso no app 15 dias antes.
- Tela de planos mostra preços como "em breve", sem botão de compra falso.
- Futuro: webhook autenticado (Stripe ou Mercado Pago) em rota de API servidor, única fonte de mudança de plano.

## 12. Etapas de implementação (revisadas)

Mudança em relação ao prompt: tarefas e recorrência viram **uma etapa só** (o modelo de tarefas depende da recorrência); o **dashboard vem depois dos módulos** que ele resume; o **banco inteiro com RLS** é criado na Etapa 2, para que a segurança seja testada de uma vez.

| # | Etapa | Conteúdo principal |
|---|---|---|
| 1 | Fundação | git, Next.js + TS strict + Tailwind + shadcn/ui, tokens de design MORANO, fontes, logotipo e ícones, app shell (bottom nav / sidebar), componentes base, Vitest e Playwright configurados, lint/format |
| 2 | Backend e autenticação | Supabase local (Docker), todas as migrations da seção 8, RLS + helpers, Storage bucket e políticas, testes pgTAP, auth e-mail/senha + Google, callback, proxy/rotas protegidas, tipos gerados |
| 3 | Casa e onboarding | fluxo de onboarding completo, catálogo de rotinas, revisão/aprovação, Minha casa (dados da casa, cômodos) |
| 4 | Rotina completa | CRUD de tarefas, prioridades, recorrência, geração de ocorrências, concluir/adiar/pular, atrasadas, histórico, calendário (semana no mobile, mês no desktop), testes de datas e fuso |
| 5 | Equipamentos, manutenção e problemas | equipamentos e garantias, anexos (upload, signed URLs), manutenções com custo, problemas com histórico, vínculos entre módulos |
| 6 | Compras | adição rápida, categorias, unidades, comprado, histórico, "comprar de novo", vínculo com problemas |
| 7 | Dashboard | frase-resumo, hoje, progresso, atenção na casa, resumo semanal (concluídas vs previstas na semana) |
| 8 | Configurações, freemium e PWA | perfil, casa, fuso, plano/limites, exportar dados, excluir conta, manifest + service worker mínimo (instalável, página offline), polimento de UX/acessibilidade |
| 9 | Testes e segurança | E2E dos fluxos principais, revisão de RLS e Storage, testes de responsividade, correções |
| 10 | Lançamento beta | projeto Supabase de produção, Vercel, variáveis de ambiente, SMTP (Resend), Google OAuth de produção, privacidade/termos, checklist, beta |

Após cada etapa: relatório no formato pedido pelo dono e **aguardar aprovação**.

## 13. Dependências previstas

Produção: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss` (+ plugin PostCSS), componentes shadcn/ui (copiados, com suas dependências Radix/`class-variance-authority`/`clsx`/`tailwind-merge`), `lucide-react`, `react-hook-form`, `@hookform/resolvers`, `zod`, `date-fns`, `@date-fns/tz`, `server-only`, `sonner` (toasts, padrão shadcn).
Desenvolvimento: `typescript`, `vitest`, `@testing-library/react` (quando houver teste de componente), `@playwright/test`, `eslint` + config Next, `prettier` (+ plugin Tailwind), `supabase` CLI.
Avaliar na Etapa 8: biblioteca de service worker (ex. Serwist) **somente** se o service worker manual não bastar.

## 14. Riscos técnicos e de negócio

1. **Docker ausente** — bloqueia Etapa 2 até a instalação.
1b. **Nenhum domínio ou conta de produção existe ainda** (confirmado pelo dono). Durante a Etapa 2, em paralelo, o dono registra um domínio e cria as contas (Google Cloud, Resend, Vercel, Supabase) com um passo a passo fornecido; a verificação do Google OAuth e do domínio no Resend começa cedo para não atrasar o beta. Desenvolvimento local usa só Supabase local + e-mails capturados pelo Inbucket/Mailpit do CLI; login com Google é testado quando as credenciais existirem.
2. **Custos de produção:** o plano Hobby da Vercel **não permite uso comercial** → Vercel Pro (~US$ 20/mês) no lançamento; Supabase Free pausa projetos inativos e tem limites → Supabase Pro (~US$ 25/mês) para produção. Valores a confirmar na Etapa 10.
3. **E-mail transacional** — SMTP próprio obrigatório antes do beta.
4. **Google OAuth** — requer projeto no Google Cloud e tela de consentimento verificada (pode levar dias).
5. **Datas e fuso** — maior risco de bug; mitigado por datas locais + testes extensos.
6. **Erros de RLS** — mitigado por helpers centralizados + pgTAP.
7. **PWA no iPhone** — instalação manual (Compartilhar → Tela de início); push só no iOS 16.4+ instalado (relevante na 1.5).
8. **Marca "MORANO"** — recomendável consultar o INPI antes do lançamento público.
9. **Textos jurídicos** — política e termos precisam de revisão profissional.

## 15. Decisões complementares (após revisão do construtor)

- **Fonte dos requisitos:** o Master Prompt original está em `docs/master-prompt.md`. Este design prevalece onde divergir.
- **Uma casa por usuário na interface do MVP** (decisão técnica). O prompt coloca múltiplas residências como "futuramente". O banco já suporta várias (`home_members`), e `profiles.current_home_id` guarda a casa ativa; todas as queries e actions resolvem a casa por ele, nunca por parâmetro do cliente sem checagem de membresia. Rotas não carregam o id da casa. Um seletor de casas entra quando o multi-casa for liberado (candidato a benefício PRO).
- **Medição do beta (decisão técnica, primeira parte, sem terceiros):** tabela `product_events` (user_id, home_id, event_name, created_at, sem conteúdo pessoal) para eventos-chave — onboarding concluído, tarefa concluída, item comprado, equipamento cadastrado, problema aberto/resolvido — e `profiles.last_seen_at`. Na tela de planos, botão **"Quero ser avisado do PRO"** grava `pro_interest` (com o plano de preço que a pessoa olhou). Leitura pelo dono via SQL/painel do Supabase no MVP. Uso declarado na Política de Privacidade. Sem cookies de terceiros.
- **Adaptação ao perfil (decisão técnica):** no MVP a adaptação acontece em (a) cômodos pré-selecionados pelo tipo de imóvel, (b) catálogo de rotina filtrado por composição da casa, nível e tempo disponível, (c) textos de onboarding e estados vazios (ex.: inquilino vê "Problemas para avisar o proprietário", proprietário vê "Problemas da casa"; o campo `home_issues.notify_landlord` boolean aparece só para alugados). Nenhum módulo é escondido.

## 16. O que fica a critério do construtor

Ícones Lucide específicos, microcopy, animações (sutis, respeitando `prefers-reduced-motion`), escala tipográfica e espaçamentos exatos dentro da identidade, organização interna de componentes, conteúdo exato do catálogo de rotinas (dentro das regras da seção 6), consultas e índices adicionais, estratégia de cache/revalidação do Next.
