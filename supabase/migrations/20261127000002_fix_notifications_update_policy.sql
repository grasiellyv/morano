-- supabase/migrations/20261127000002_fix_notifications_update_policy.sql
--
-- Fix wave (final review, Important 3): `notifications_update_own` só checava
-- `actor_id = auth.uid()` no `with check`, sem reafirmar `home_id`. Um usuário
-- autenticado poderia, em tese, dar PATCH na própria notificação movendo-a
-- para o `home_id` de outra casa (se soubesse/adivinhasse o uuid), injetando
-- texto arbitrário no feed de uma casa que não é a sua. A policy de SELECT já
-- escopa por `home_id = current_home_id`, então sem essa amarração no UPDATE
-- a notificação "roubada" nem apareceria pro próprio autor depois — mas teria
-- aparecido, antes do UPDATE, no feed real da casa alvo.
--
-- Também troca o grant de UPDATE table-wide por um grant coluna-a-coluna:
-- `title`, `meta` e `created_at` são as únicas colunas que a consolidação em
-- `src/features/notifications/emit.ts` de fato escreve. Isso é defesa em
-- profundidade: mesmo que a policy tivesse um furo, o grant por si só já
-- impede escrever em `home_id`, `actor_id`, `type`, `entity_id` etc.

drop policy notifications_update_own on notifications;

create policy notifications_update_own on notifications
  for update to authenticated
  using (
    actor_id = auth.uid()
    and home_id = (select current_home_id from profiles where id = auth.uid())
  )
  with check (
    actor_id = auth.uid()
    and home_id = (select current_home_id from profiles where id = auth.uid())
  );

revoke update on notifications from authenticated;
grant update (title, meta, created_at) on notifications to authenticated;
