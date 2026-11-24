-- Manutenção da casa (gerar ocorrências, marcar atrasadas, avançar rodízio) fora do caminho de
-- toda visita a Início/Rotina. A função decide, de forma atômica, quem roda: a primeira chamada
-- depois de `p_min_interval` assume (claimed = true) e as demais pulam (claimed = false), mesmo
-- com várias abas/pessoas abrindo ao mesmo tempo. `previous` diz quando foi a execução anterior
-- (o app roda de forma síncrona só na primeira visita de cada dia; no resto, em segundo plano).

alter table public.homes add column maintenance_ran_at timestamptz;

create function public.claim_home_maintenance(
  p_home_id uuid,
  p_min_interval interval default interval '15 minutes'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev timestamptz;
  v_claimed boolean := false;
begin
  if not public.is_home_member(p_home_id) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  -- Trava a linha da casa: duas chamadas simultâneas não assumem ao mesmo tempo.
  select h.maintenance_ran_at into v_prev
  from public.homes h
  where h.id = p_home_id
  for update;

  if not found then
    return jsonb_build_object('claimed', false, 'previous', null);
  end if;

  if v_prev is null or v_prev < now() - p_min_interval then
    update public.homes set maintenance_ran_at = now() where id = p_home_id;
    v_claimed := true;
  end if;

  return jsonb_build_object('claimed', v_claimed, 'previous', v_prev);
end;
$$;

revoke all on function public.claim_home_maintenance(uuid, interval) from public, anon;
grant execute on function public.claim_home_maintenance(uuid, interval) to authenticated;
