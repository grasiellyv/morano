# MORANO — Relatório da Etapa 1 (Fundação)

**Sua casa. Sob controle.**

Branch: `etapa-1-fundacao`. Esta etapa não tem nenhuma funcionalidade de verdade ainda: é o alicerce visual e técnico sobre o qual as próximas etapas serão construídas.

## 1. O que foi desenvolvido

- **Projeto base**: aplicativo Next.js com TypeScript rigoroso, Tailwind, formatação automática (Prettier) e verificação de código (ESLint).
- **Identidade visual**: cores, fontes e espaçamentos da marca MORANO definidos em um só lugar, com tema claro e verificação automática de contraste (legibilidade).
- **Logotipo "morano."** e ícones do app, mais o manifesto que permite instalar o MORANO como app no celular.
- **Componentes prontos**: botão, campo de texto, rótulo, caixa de confirmação, avisos (toasts), esqueleto de carregamento, cabeçalho de página e tela de "nada por aqui ainda".
- **Estrutura de navegação**: barra inferior no celular e menu lateral no computador, com o item da página atual destacado. Seções: Início, Casa, Rotina, Compras, Manutenção e Configurações (todas ainda como páginas provisórias).
- **Acessibilidade**: link "Pular para o conteúdo", foco visível ao navegar pelo teclado, respeito às áreas seguras de celulares com entalhe.
- **Galeria de estilo** (`/estilo`): página interna que mostra todos os componentes, para conferir o visual.
- **Testes automáticos** de unidade e de navegador.

## 2. Arquivos criados ou modificados

53 arquivos (cerca de 1.800 linhas de código; o restante do volume é o arquivo de travamento de versões). Os principais grupos:

- Configuração do projeto: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json`, `vitest.config.mts`, `playwright.config.ts`, `components.json`, `.env.example`, `README.md`, `AGENTS.md`.
- Visual e marca: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/manifest.ts`, `src/app/icon.svg`, `src/app/apple-icon.tsx`, `src/components/brand/*`.
- Componentes: `src/components/ui/*`, `src/components/feedback/*`.
- Navegação: `src/components/layout/*` (menu lateral, barra inferior, cabeçalho, regra do item ativo).
- Páginas: `src/app/(app)/*` (início, casa, rotina, compras, manutenção, configurações) e `src/app/(dev)/estilo/*`.
- Testes: `tests/e2e/shell.spec.ts` e arquivos `*.test.ts(x)` ao lado do código.

## 3. Dependências adicionadas (versões instaladas)

**Em uso no app:** next 16.4.6, react 19.3.0, react-dom 19.3.0, radix-ui 1.8.1, lucide-react 1.74.0, class-variance-authority 0.7.1, cn 0.5.2, sonner 2.0.8, next-themes 0.4.6, tw-animate-css 1.4.0.

**Apenas desenvolvimento:** typescript 5.9.3, tailwindcss 4.3.3, @tailwindcss/turbopack 4.3.3, eslint 9.39.5, eslint-config-next 16.4.6, prettier 3.10.1, prettier-plugin-tailwindcss 0.8.1, shadcn 4.23.0, vitest 5.1.0, jsdom 31.0.1, @vitejs/plugin-react 6.3.0, vite-tsconfig-paths 6.1.1, @testing-library/react 16.3.3, @testing-library/dom 10.4.2, @testing-library/jest-dom 7.0.1, @testing-library/user-event 14.6.12, @playwright/test 1.65.1, @types/node 22.20.5, @types/react 19.3.0, @types/react-dom 19.3.0.

## 4. Testes executados

- **Vitest (unidade): 33 de 33 passaram** (5 arquivos). Cobrem contraste das cores, logotipo, manifesto, componentes de feedback e regra do item ativo da navegação.
- **Playwright (navegador): 16 passaram, 4 foram ignorados por projeto** (testes que só valem no celular ou só no computador, então cada um roda no formato certo).
- Também passaram: formatação, lint, verificação de tipos e build de produção.

## 5. Problemas encontrados

1. **@types/node atualizado** para a versão 22 por exigência do Vitest. Sem impacto para o usuário.
2. **Dependências extras do shadcn v4**: o instalador de componentes trouxe pacotes adicionais (cn, radix-ui, next-themes, tw-animate-css). Conferimos a origem e aceitamos; o `shadcn` ficou só como ferramenta de desenvolvimento.
3. **Redirecionamento da raiz** (`/` para `/inicio`) foi movido para `next.config.ts`, mais simples que uma página dedicada. Na Etapa 2 ele passa para o `proxy.ts`.
4. **Cores Sálvia e Caramelo não têm contraste suficiente como texto** (padrão AA de acessibilidade). Criamos tons derivados mais escuros para texto; as cores originais seguem valendo para fundos e detalhes. Também criamos o tom "pedra" (#827b6f) para a borda dos campos.
5. **Contraste do anel de foco e da borda dos campos**: a revisão final achou que ficavam fracos demais. Corrigido e coberto por testes.
6. **Botão destrutivo (excluir) sem mudança visível ao passar o mouse**: para manter o texto legível (contraste mínimo 4,5), o fundo no hover ficou igual ao de repouso. Decidimos aceitar por ora. Será revisto na Etapa 3 ou 4, quando houver botões de excluir, com um tom próprio para o hover.
7. **Manifesto sem ícones PNG de 192 e 512 px**: o app ainda não é totalmente instalável como PWA. Fica para a Etapa 8.
8. **Configurações `cacheComponents` e `partialPrefetching`** vieram ligadas por padrão no projeto gerado. Precisam ser decididas no início da Etapa 2, antes de ler cookies de login, para evitar erros de build.
9. Pendências menores (anéis translucidos de erro em formulários) ficam para a Etapa 3.

## 6. O que falta

**Próximo passo: Etapa 2.** Começa pela decisão do item 8 acima, depois autenticação e banco de dados (Supabase). Aguardo sua aprovação antes de iniciar.

**Tarefas suas, em paralelo (um passo a passo virá na Etapa 2):**

- Registrar um domínio.
- Criar contas no Google Cloud, Resend, Vercel e Supabase.

## 7. Como ver

1. No terminal, na pasta do projeto: `npm run dev`
2. Abra http://localhost:3000/inicio (aplicativo com a navegação)
3. Abra http://localhost:3000/estilo (galeria de componentes)

Dica: diminua a janela do navegador até ficar do tamanho de um celular para ver a barra de navegação inferior.
