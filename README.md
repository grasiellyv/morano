# MORANO

Gestão da casa, sem dor de cabeça.

## Requisitos

- Node.js >= 20.9
- Docker Desktop (a partir da Etapa 2, para o Supabase local)

## Scripts

- `npm run dev` — inicia o servidor de desenvolvimento.
- `npm run build` — gera o build de produção.
- `npm run start` — serve o build de produção.
- `npm run lint` — executa o ESLint.
- `npm run typecheck` — verifica os tipos com `tsc --noEmit`.
- `npm run format` — formata o código com Prettier.
- `npm run format:check` — verifica a formatação sem alterar arquivos.
- `npm test` — executa os testes unitários uma vez (Vitest).
- `npm run test:watch` — executa os testes em modo observação.

## Documentação

- [Master prompt](docs/master-prompt.md)
- [Especificação do MVP](docs/superpowers/specs/2026-11-18-morano-mvp-design.md)
