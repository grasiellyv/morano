# Manutenção — Módulo de Problemas e Serviços Ad-hoc

## Intent and Why

Usuários precisam registrar e acompanhar problemas e serviços na casa que não fazem parte da rotina regular de limpeza — coisas como "vazamento na pia", "pintar o quarto", "chamar eletricista". A página `/manutencao` existe como placeholder desde a Etapa 5 e não tem funcionalidade alguma.

## Goals

- Registrar itens de manutenção manualmente (título, descrição opcional, cômodo opcional)
- Rastrear status com transição linear: `pendente → em_andamento → concluído`
- Registrar notas de progresso enquanto o item está em andamento ("encanador veio, precisa de peça")
- Cancelar itens quando não for mais necessário
- Celebrar conclusões com o overlay 🎉 (reutiliza `CelebrationOverlay`)

## Non-goals

- Sem data prevista (Opção 3 — deferida)
- Sem custo estimado
- Sem assigned_to (pode vir depois)
- Sem recorrência (isso pertence ao sistema de rotina)
- Não substitui tarefas da rotina para serviços regulares

## Anti-goals

- Um item marcado como concluído não deve ser editável (apenas cancelado antes da conclusão)
- Não é um sistema de ordem de serviço ou fatura

## Constraints

- `home_id` sempre derivado de `profiles.current_home_id` no servidor — nunca aceito do cliente (padrão RLS do projeto)
- Transições de status validadas no servidor; o cliente só envia a nova transição
- Zod 4 schemas; `textField(fd, "field_name")` helper para FormData
- React 19 + `useActionState`; server actions
- Reutilizar `CelebrationOverlay` de `src/features/tasks/components/celebration-overlay.tsx` (ou caminho equivalente)
- Seguir padrão de permissões: todos os membros da casa podem criar/atualizar/excluir itens (sem permissão granular específica — igual ao padrão de tarefas)
- Vitest: manter 180/180 passando; adicionar testes para schemas

## Approaches

**Opção 1 — Status simples, sem notas** (descartada): schema mínimo, mas sem forma de registrar o que foi feito no meio do caminho — perde valor real.

**Opção 2 — Status + notas de acompanhamento** (escolhida): campo `notes` texto livre e editável no item; permite registrar andamento ("encanador veio, precisa de peça") sem a complexidade de um log de comentários separado.

**Opção 3 — Status + notas + data prevista** (deferida): `due_date` nullable pode entrar depois se fizer falta, sem mudar o schema core.

## Schema

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_manutencao.sql

CREATE TYPE maintenance_status AS ENUM ('pendente', 'em_andamento', 'concluido', 'cancelado');

CREATE TABLE maintenance_items (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id      UUID             NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  room_id      UUID             REFERENCES rooms(id) ON DELETE SET NULL,
  title        TEXT             NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description  TEXT,
  notes        TEXT,
  status       maintenance_status NOT NULL DEFAULT 'pendente',
  created_by   UUID             NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;

-- Members of the home can do everything
CREATE POLICY "home members full access"
  ON maintenance_items FOR ALL
  USING (
    home_id IN (
      SELECT current_home_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    home_id IN (
      SELECT current_home_id FROM profiles WHERE id = auth.uid()
    )
  );

GRANT ALL ON maintenance_items TO authenticated;
```

`resolved_at` é preenchido pelo servidor quando `status` muda para `concluido` ou `cancelado`.

## Zod Schemas (`src/features/manutencao/schemas.ts`)

```typescript
// createMaintenanceSchema
{ title: string (1–200), description?: string, room_id?: uuid, notes?: string }

// updateMaintenanceSchema
{ id: uuid, title: string, description?: string, room_id?: uuid, notes?: string }

// updateStatusSchema
{
  id: uuid,
  status: z.enum(["em_andamento", "concluido", "cancelado"])
  // "pendente" não aparece aqui — itens nascem pendentes; não dá pra regredir
}

// deleteMaintenanceSchema
{ id: uuid }
```

Minha decisão: não permitir regressão de status (nem `concluido → em_andamento`). Um item concluído por engano deve ser recriado.

## Server Actions (`src/features/manutencao/actions.ts`)

Quatro actions, todas com o padrão `FormState`:

| Action | Operação |
|---|---|
| `createMaintenanceItem` | INSERT; `created_by = auth.uid()` |
| `updateMaintenanceItem` | UPDATE title/description/room_id/notes — nunca o status |
| `updateMaintenanceStatus` | UPDATE status; valida transição; preenche `resolved_at` quando status = concluido/cancelado |
| `deleteMaintenanceItem` | DELETE; verifica `.select("id")` pós-delete para detectar item não encontrado |

Separar `updateMaintenanceItem` de `updateMaintenanceStatus` evita que o form de edição mexa acidentalmente no status.

## Queries (`src/features/manutencao/queries.ts`)

```typescript
type MaintenanceItem = {
  id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  status: "pendente" | "em_andamento" | "concluido" | "cancelado";
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  room: { name: string } | null;
};

// getMaintenanceItems(supabase, homeId): Promise<MaintenanceItem[]>
// SELECT com JOIN em rooms; ordenar: status (pendente/em_andamento primeiro), depois created_at DESC
```

## UI

### `/manutencao/page.tsx`

Server component; substitui o placeholder. Busca itens e passa para `MaintenanceList`.

### Duas seções

- **Em aberto**: itens `pendente` e `em_andamento` — mostrados sempre
- **Histórico**: itens `concluido` e `cancelado` — colapsável (fechado por default quando vazio; aberto se houver itens)

### Formulário de criação (`AddMaintenanceForm`)

Inline no topo da lista (padrão igual ao AddItemForm das compras):
- Campo de título (required) + botão Adicionar
- Expandível: campos opcionais de descrição, cômodo (dropdown dos cômodos da casa), notas

### Card do item (`MaintenanceItemCard`)

Cada card exibe:
- Título + badge de status colorido
- Descrição (truncada, 2 linhas)
- Nome do cômodo (se houver)
- Notas (se houver, em destaque menor)
- Botões de ação inline conforme o status:
  - `pendente`: "Iniciar" → `em_andamento` | "Cancelar"
  - `em_andamento`: "Concluir" → `concluido` | "Cancelar"
  - `concluido` / `cancelado`: sem ações de status (somente exclusão)
- Botão de editar (abre form inline ou expande o card)

### Celebração 🎉

Ao concluir um item (`status = concluido`), renderizar `CelebrationOverlay` (já existe em tarefas).

## Files

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<ts>_manutencao.sql` | Criar |
| `src/types/database.ts` | Regenerar (`npx supabase gen types typescript --local`) |
| `src/features/manutencao/schemas.ts` | Criar |
| `src/features/manutencao/queries.ts` | Criar |
| `src/features/manutencao/actions.ts` | Criar |
| `src/features/manutencao/components/maintenance-list.tsx` | Criar |
| `src/features/manutencao/components/maintenance-item-card.tsx` | Criar |
| `src/features/manutencao/components/add-maintenance-form.tsx` | Criar |
| `src/app/(app)/manutencao/page.tsx` | Substituir placeholder |
| `src/features/manutencao/schemas.test.ts` | Criar |

## Decisions from Builder Review

**1. CelebrationOverlay — estender com props opcionais.**
Adicionar `title?: string` e `message?: string` ao componente existente, com os textos atuais como defaults (`"Rotina completa!"` / `"Todas as tarefas do dia foram concluídas."`). Para manutenção usar `title="Item concluído! 🎉"` e `message="Registrado no histórico."`. Não criar componente separado.

**2. Validação de transição — sem regressão apenas.**
`updateMaintenanceStatus` aceita `em_andamento | concluido | cancelado` (schema já exclui `pendente`). Não enforça linearity estrita (`pendente → concluido` é permitido). A UI só oferece o próximo passo correto; um SELECT extra de validação de caminho não agrega segurança real aqui.

**3. Edição bloqueada para `concluido` E `cancelado`.**
`updateMaintenanceItem` faz SELECT do status atual antes de atualizar; retorna erro se `status IN ('concluido', 'cancelado')`. Na UI, o botão de editar fica oculto para ambos os status. Para deletar: permitido em qualquer status (o usuário pode limpar o histórico).

## Builder's Calls (What's Left to the Builder)

- Estilo visual do badge de status (cores exatas)
- Layout exacto do card (proporções, espaçamento)
- Texto exacto dos botões de ação ("Iniciar" / "Concluir" / "Cancelar" são sugestões)
- Estratégia de expansão do form de criação (toggle vs. sempre aberto)
