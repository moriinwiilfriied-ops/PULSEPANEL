-- PulsePanel — Wallet serveur : balances + ledger + validation dashboard
-- Exécuter après 0003_campaign_progress.sql

-- ---------- 1) Table responses : reward_cents + payout_status ----------
alter table public.responses
  add column if not exists reward_cents int not null default 0;

alter table public.responses
  add column if not exists payout_status text not null default 'pending';

alter table public.responses
  drop constraint if exists responses_payout_status_check;

alter table public.responses
  add constraint responses_payout_status_check
  check (payout_status in ('pending', 'available'));

-- ---------- 2) Table ledger_entries : index + idempotence ----------
create index if not exists idx_ledger_entries_entity
  on public.ledger_entries (entity_type, entity_id);

alter table public.ledger_entries
  drop constraint if exists ledger_entries_entity_reason_unique;

alter table public.ledger_entries
  add constraint ledger_entries_entity_reason_unique
  unique (entity_type, entity_id, reason);

-- ---------- 3) Trigger : crédit pending à chaque réponse ----------
create or replace function public.handle_response_credit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward_cents int;
  v_org_id uuid;
begin
  select c.reward_cents, c.org_id
  into v_reward_cents, v_org_id
  from public.campaigns c
  where c.id = new.campaign_id;

  if v_reward_cents is null then
    return new;
  end if;

  update public.responses
  set reward_cents = v_reward_cents,
      payout_status = 'pending'
  where id = new.id;

  insert into public.user_balances (user_id, pending_cents, available_cents)
  values (new.user_id, 0, 0)
  on conflict (user_id) do nothing;

  update public.user_balances
  set pending_cents = pending_cents + v_reward_cents,
      updated_at = now()
  where user_id = new.user_id;

  insert into public.ledger_entries (
    entity_type, entity_id, amount_cents, currency, reason, ref_id, status
  )
  values (
    'response', new.id, v_reward_cents, 'EUR', 'answer_reward', new.id, 'pending'
  );

  return new;
end;
$$;

drop trigger if exists trg_response_credit on public.responses;
create trigger trg_response_credit
  after insert on public.responses
  for each row execute function public.handle_response_credit();

-- ---------- 4) Helpers pour RPC (sécurisation org) ----------
create or replace function public.campaign_org(_campaign_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from public.campaigns where id = _campaign_id;
$$;

create or replace function public.can_manage_org(_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = _org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  );
$$;

-- ---------- 5) RPC Dashboard : valider les paiements d'une campagne ----------
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
  v_org_id := public.campaign_org(_campaign_id);
  if v_org_id is null then
    return jsonb_build_object('error', 'campaign_not_found');
  end if;
  if not public.can_manage_org(v_org_id) then
    return jsonb_build_object('error', 'forbidden');
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
    'total_cents', v_total_cents
  );
end;
$$;

grant execute on function public.campaign_org(uuid) to authenticated;
grant execute on function public.can_manage_org(uuid) to authenticated;
grant execute on function public.validate_campaign_payouts(uuid) to authenticated;
