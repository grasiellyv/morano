# MORANO

Sua casa. Sob controle.

## Requisitos

- Node.js >= 20.9
- Docker Desktop em execução (obrigatório: o Supabase roda localmente em contêineres)

## Supabase local

1. Abra o Docker Desktop.
2. `npm run db:start` — sobe Postgres, Auth, Storage e Mailpit (a primeira vez baixa as imagens e demora).
3. `npm run db:status` — mostra as URLs e as chaves. Copie `.env.example` para `.env.local` e preencha:
   `NEXT_PUBLIC_SUPABASE_URL` (API URL), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Publishable) e `SUPABASE_SECRET_KEY` (Secret).
   O `.env.local` não vai para o Git.
4. Os e-mails de confirmação e de redefinição de senha chegam ao Mailpit, no endereço `Mailpit` impresso pelo `db:status` (padrão http://127.0.0.1:54324).

## Scripts

- `npm run dev` — inicia o servidor de desenvolvimento.
- `npm run build` — gera o build de produção.
- `npm run start` — serve o build de produção.
- `npm run lint` — executa o ESLint.
- `npm run typecheck` — gera os tipos do Next e verifica os tipos (`next typegen && tsc --noEmit`).
- `npm run format` — formata o código com Prettier.
- `npm run format:check` — verifica a formatação sem alterar arquivos.
- `npm test` — executa os testes unitários uma vez (Vitest).
- `npm run test:watch` — executa os testes em modo observação.
- `npm run test:e2e` — executa os testes de navegador (Playwright).
- `npm run db:start` / `db:stop` — sobe e para o Supabase local.
- `npm run db:status` — mostra URLs e chaves locais.
- `npm run db:reset` — recria o banco a partir das migrations.
- `npm run db:test` — executa os testes do banco (pgTAP).
- `npm run db:types` — gera `src/types/database.ts` a partir do banco local.

## Documentação

- [Master prompt](docs/master-prompt.md)
- [Especificação do MVP](docs/superpowers/specs/2026-11-18-morano-mvp-design.md)
