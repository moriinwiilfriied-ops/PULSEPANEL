-- PulsePanel — Durcissement RPC validate_campaign_payouts (guards explicites + sortie enrichie)
-- Exécuter après 0004_wallet_server.sql

-- ---------- RPC avec guards explicites ----------
create or replace function public.validate_campaign_payouts(_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_validated_responses int;
  v_users int;
  v_total_cents bigint;
  r record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_org_id := public.campaign_org(_campaign_id);
  if v_org_id is null then
    raise exception 'campaign_not_found';
  end if;

  if not public.can_manage_org(v_org_id) then
    raise exception 'forbidden';
  end if;

  v_validated_responses := 0;
  v_users := 0;
  v_total_cents := 0;

  for r in (
    select user_id, sum(reward_cents) as total_cents, array_agg(id) as response_ids
    from public.responses
    where campaign_id = _campaign_id and payout_status = 'pending'
    group by user_id
  )
  loop
    update public.user_balances
    set pending_cents = pending_cents - r.total_cents::int,
        available_cents = available_cents + r.total_cents::int,
        updated_at = now()
    where user_id = r.user_id;

    update public.responses
    set payout_status = 'available'
    where id = any(r.response_ids);

    update public.ledger_entries
    set status = 'available'
    where entity_type = 'response' and entity_id = any(r.response_ids);

    v_validated_responses := v_validated_responses + coalesce(array_length(r.response_ids, 1), 0);
    v_users := v_users + 1;
    v_total_cents := v_total_cents + r.total_cents;
  end loop;

  return jsonb_build_object(
    'validated_responses', v_validated_responses,
    'users', v_users,
    'total_cents', v_total_cents,
    'campaign_id', _campaign_id
  );
end;
$$;
