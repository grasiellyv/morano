# MORANO — Relatório da Etapa 2 (Backend e autenticação)

**Sua casa. Sob controle.**

Branch: `etapa-2-backend-auth`. Esta etapa montou o "cérebro" do app: todo o banco de dados (rodando no seu computador, via Docker), as regras de segurança e a entrada de usuários (cadastro, login, recuperação de senha). As telas de conteúdo (tarefas, equipamentos etc.) ainda são provisórias e chegam nas próximas etapas.

## 1. O que foi desenvolvido

- **Banco de dados completo do MVP** (Supabase local): perfis, casas, membros, assinaturas, cômodos, tarefas e recorrências, ocorrências, equipamentos, manutenções, problemas, lista de compras, anexos, telemetria própria e estrutura para notificações push.
- **Isolamento entre casas**: toda tabela tem proteção por linha (RLS). Uma pessoa só enxerga e altera dados da própria casa. Há testes que tentam "furar" essa proteção de propósito (inclusive ligando itens de uma casa a outra).
- **Armazenamento privado de anexos** (fotos e documentos) com regras de acesso por casa; anexos são exclusivos do plano PRO.
- **Limites do plano no próprio banco**: grátis = 1 casa, 40 tarefas ativas e 5 equipamentos ativos; PRO sem esses limites. Os limites só barram **novos** cadastros; nunca bloqueiam ver, editar ou apagar o que já existe. Na fase beta, todo novo usuário ganha PRO.
- **Cadastro e login**: e-mail e senha com confirmação por e-mail, recuperação de senha, sair da conta, e botão "Continuar com Google" (escondido até você fornecer as credenciais).
- **Rotas protegidas**: quem não está logado é levado para `/entrar` e volta ao lugar de origem depois de entrar; endereços de retorno externos são bloqueados (proteção contra redirecionamento malicioso).
- **E-mails em português** (confirmação e recuperação), com modelos próprios.
- **Testes de ponta a ponta com login real**: o navegador de teste cria contas, lê o e-mail de confirmação numa caixa de e-mail local (Mailpit) e percorre os fluxos de verdade.
- **Guia para suas contas de produção**: `docs/guias/contas-producao.md`, passo a passo (domínio, Supabase, Google, Resend, Vercel).

## 2. Arquivos criados ou modificados

Cerca de 70 arquivos neste ramo. Principais grupos:

- Banco: `supabase/migrations/*` (5 arquivos, por assunto: fundação, rotina, manutenção, compras e anexos, planos e telemetria), `supabase/tests/*` (5 arquivos de teste), `supabase/seed.sql`, `supabase/config.toml`, `supabase/templates/{confirmation,recovery}.html`.
- Acesso ao banco no app: `src/lib/supabase/*` (clientes de navegador, servidor, administrativo e do `proxy`), `src/types/database.ts` (tipos gerados), `src/lib/env.ts`.
- Autenticação: `src/proxy.ts`, `src/features/auth/*` (ações, validações, mensagens, formulários), `src/lib/auth/*` (próximo endereço seguro, cookie de recuperação, exigir usuário), `src/app/(auth)/*` (telas), `src/app/auth/*` (rotas de confirmação e retorno do Google).
- Testes: `tests/e2e/{global-setup,auth.spec,shell.spec}.ts`, `tests/e2e/helpers/{admin,mailpit}.ts`, mais testes de unidade ao lado do código.
- Documentação e configuração: `docs/guias/contas-producao.md`, este relatório, `.env.example`, `.gitattributes`, `playwright.config.ts`, `next.config.ts`.

## 3. Dependências adicionadas (versões instaladas)

**Em uso no app:** @supabase/supabase-js 2.119.0, @supabase/ssr 0.12.7, zod 4.6.7, react-hook-form 7.92.0, @hookform/resolvers 7.0.7, server-only 0.0.1.

**Apenas desenvolvimento:** supabase (CLI) 3.2.0. O Playwright 1.65.1 e o Vitest 5.1.0 já existiam; nenhuma dependência nova foi necessária para os testes de ponta a ponta.

Observação: o carregamento do `.env.local` nos testes usa `@next/env`, que já vem junto com o Next.js 16.4.6.

## 4. Testes executados

Rodada final, todos com resultado de sucesso:

- **pgTAP (banco): 440 verificações em 5 arquivos, todas passaram.**
- **Vitest (unidade): 70 de 70 passaram** (11 arquivos).
- **Playwright (navegador): 27 passaram, 4 ignorados** (testes que só valem no celular ou só no computador). Inclui os 9 testes de autenticação: cadastro com confirmação por e-mail, usuário não confirmado barrado, senha errada, redirecionamento externo bloqueado, recuperação de senha completa, sair da conta, botão Google oculto, termos obrigatórios e rota protegida.
- Também passaram: formatação, lint, verificação de tipos, `db:reset` e build de produção.

## 5. Problemas encontrados

1. **Finais de linha**: no Windows o Git convertia arquivos e quebrava a formatação. Adicionamos `.gitattributes` para padronizar em LF.
2. **Membros adicionados pelo próprio cliente**: removemos a permissão de o app inserir diretamente em `home_members`, que permitiria alguém se colocar na casa dos outros. Adicionar membros só será possível com o fluxo de convites (versão 1.5).
3. **Upload no Storage só para PRO**: a regra do plano também vale para o envio de arquivos (antes só valia na tabela de anexos).
4. **E-mails e recuperação de senha**: criamos modelos de e-mail próprios (links diretos para o app, mais seguros) e um cookie de 15 minutos que só deixa trocar a senha quem veio do link de recuperação. **Esses modelos precisam ser copiados para o painel do Supabase em produção**, senão os links dos e-mails quebram (está no guia).
5. **Limite de e-mails no ambiente local**: o padrão do Supabase local (2 e-mails por hora) travaria os testes. Subimos para 100 **apenas no arquivo de configuração local** (`supabase/config.toml`). A produção continua com os limites do próprio Supabase. O Supabase local foi reiniciado (dados mantidos).
6. **Servidor de teste separado**: o Next não deixa dois servidores de desenvolvimento na mesma pasta. Os testes agora usam a pasta de build `.next-e2e` e a porta 3100, então não atrapalham o servidor que você deixa aberto em `localhost:3000`.
7. **Enumeração de e-mails por tempo de resposta (residual)**: as mensagens são idênticas para conta existente ou não, mas medindo o tempo de resposta ainda seria teoricamente possível adivinhar se um e-mail existe. Risco baixo; fica para endurecimento posterior.
8. **Corrida nos limites do plano**: duas criações simultâneas no limite exato podem passar do limite por uma unidade. A solução (bloqueio no banco) fica para depois.
9. **Arquivos órfãos no Storage**: apagar uma linha ou uma casa não apaga o arquivo guardado. Uma limpeza automática (com a chave de serviço) fica para as etapas 5 e 8.
10. **Data de relato em UTC**: `reported_at` de problemas usa a data UTC por padrão; o app deve enviar a data local da casa (Etapa 5).
11. **Pendências menores registradas**: o dono pode se rebaixar e deixar a casa sem dono (decidir junto com a exclusão de conta, Etapa 8); regras de consistência de status e datas das tarefas e manutenções (Etapa 4); fotos HEIC do iPhone ainda não aceitas em anexos (conversão no cliente, Etapa 5); ícone do botão "Sair" aguardando seu feedback.

## 6. O que falta

**Próximo passo: Etapa 3.** Aguardo sua aprovação antes de iniciar.

**Tarefas suas (em paralelo):** o checklist de contas está em `docs/guias/contas-producao.md`:

- Registrar o domínio.
- Criar o projeto no Supabase (região São Paulo) e colar os dois modelos de e-mail no painel.
- Criar o projeto no Google Cloud (a verificação pode levar dias; comece cedo).
- Criar a conta no Resend e verificar o domínio.
- Vercel (plano Pro) pode esperar até a Etapa 10.

Lembrete: chaves secretas nunca vão em chat; vão direto nos painéis ou no `.env.local`.

## 7. Como ver

1. Abra o Docker Desktop e, na pasta do projeto: `npm run db:start`
2. Rode o app: `npm run dev` e abra http://localhost:3000. Você será levado para `/entrar`.
3. Crie uma conta em `/cadastro`. O e-mail de confirmação aparece na caixa local em http://127.0.0.1:54324 (Mailpit); clique no link.
4. Para ver o banco: http://127.0.0.1:54323 (Studio do Supabase).
5. Para rodar tudo: `npm test`, `npm run db:test` e `npm run test:e2e`.
