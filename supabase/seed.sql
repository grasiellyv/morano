-- =============================================================================
-- Seed LOCAL (roda só em `supabase db reset`). Nunca vai para produção.
-- Helpers de teste para pgTAP no schema `tests`.
-- =============================================================================

create schema if not exists tests;

-- Cria um usuário confirmado em auth.users (dispara on_auth_user_created).
-- p_meta simula o user_metadata do signUp; o padrão aceita os termos.
create or replace function tests.create_user(
  p_email text,
  p_meta jsonb default '{"full_name": "Pessoa Teste", "terms_accepted": "true"}'::jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt('Morano123', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb, p_meta, now(), now(),
    '', '', '', ''
  );
  return v_id;
end;
$$;

-- Passa a agir como o usuário (role authenticated + claims do JWT) até o fim
-- da transação. Não é security definer: `set role` não é permitido nelas.
create or replace function tests.authenticate_as(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'request.jwt.claims',
    pg_catalog.json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
end;
$$;

-- Volta para anon, sem claims.
create or replace function tests.clear_authentication()
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config('request.jwt.claims', '', true);
  set local role anon;
end;
$$;

-- Executa um comando (update/delete/insert) e devolve quantas linhas ele
-- afetou. Útil para provar que a RLS filtrou silenciosamente (0 linhas).
-- security invoker: roda com os privilégios de quem chama.
create or replace function tests.affected_rows(p_sql text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  execute p_sql;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- create_user/authenticate_as só para postgres (permitiriam personificar
-- qualquer usuário). Nos testes, volte com `reset role` antes de trocar de
-- usuário. clear_authentication só rebaixa para anon, então é liberada.
revoke all on function tests.create_user(text, jsonb) from public, anon, authenticated;
revoke all on function tests.authenticate_as(uuid) from public, anon, authenticated;
grant usage on schema tests to anon, authenticated;
grant execute on function tests.clear_authentication() to anon, authenticated;
grant execute on function tests.affected_rows(text) to anon, authenticated;
