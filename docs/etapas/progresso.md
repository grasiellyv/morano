# MORANO — Registro de progresso

Atualizado ao fim de cada etapa. Novas sessões leem este arquivo primeiro.

## Status geral

| Etapa | Título | Status | Branch/Commit |
|---|---|---|---|
| 1 | Fundação | ✅ Completa | main (acf9730) |
| 2 | Backend e autenticação | ✅ Completa | main (merge 2764ba8) |
| 3 | Casa e onboarding | ✅ Completa | worktree-etapa-3-casa-onboarding (0650b09) |
| 4 | Rotina completa | ✅ Completa | worktree-etapa-4-rotina (commit final após task 7) |
| 5 | Compras | ⏳ Aguardando | — |
| 6 | Dashboard mínimo | ⏳ Aguardando | — |
| 7 | Configurações essenciais + lançamento | ⏳ Aguardando | — |

## Reordenação aprovada (2026-11-18)

Etapas originais 5 (equipamentos/manutenção/problemas) e 9 (testes separados) foram movidas para pós-validação.
Etapa 6 (compras) foi avançada para Etapa 5. Dashboard (era 7) virou Etapa 6. Configurações+lançamento (era 8+10) virou Etapa 7.

## Decisões de infraestrutura (2026-11-18)

- Supabase Cloud Free tier (sem Google OAuth, sem Resend, sem domínio próprio por enquanto)
- Vercel Hobby/Pro para deploy
- URL da Vercel no lugar de domínio próprio
- Google OAuth adiado (flag `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` já em false)

## Planos de implementação

- Etapa 1: `docs/superpowers/plans/2026-11-18-etapa-1-fundacao.md`
- Etapa 2: `docs/superpowers/plans/2026-11-18-etapa-2-backend-auth.md`
- Etapa 3: `docs/superpowers/plans/2026-11-18-etapa-3-casa-onboarding.md`

## Relatórios

- Etapa 1: `docs/etapas/etapa-1-relatorio.md`
- Etapa 2: `docs/etapas/etapa-2-relatorio.md`
- Etapa 3: `docs/etapas/etapa-3-relatorio.md`
- Etapa 4: `docs/etapas/etapa-4-relatorio.md`

## Como retomar uma sessão

1. Ler este arquivo
2. Ver o status da etapa atual na tabela acima
3. Se há etapa em andamento: ler o ledger em `.superpowers/sdd/<branch>/progress.md`
4. Se a etapa não iniciou: ler o plano e iniciar com `superpowers:subagent-driven-development`
