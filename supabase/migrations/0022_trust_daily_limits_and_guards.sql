-- PulsePanel — Plafonds journaliers par trust_level + enforcement serveur
-- Bucket journalier : UTC (jour calendaire UTC). Source de vérité : trust_daily_limits.
-- Enforcement : BEFORE INSERT sur responses ; check dans request_withdrawal.

-- ---------- 1) Table trust_daily_limits (source de vérité) ----------
create table if not exists public.trust_daily_limits (
  trust_level text primary key,
  max_valid_responses_per_day int not null,
  max_reward_cents_per_day int not null,
  max_withdrawal_requests_per_day int not null default 1,
  updated_at timestamptz not null default now()
);

comment on table public.trust_daily_limits is 'Plafonds journaliers par niveau de confiance (jour UTC).';

insert into public.trust_daily_limits (trust_level, max_valid_responses_per_day, max_reward_cents_per_day, max_withdrawal_requests_per_day)
values
  ('Bronze', 10, 500, 1),
  ('Argent', 20, 1000, 2),
  ('Or', 50, 2500, 3)
on conflict (trust_level) do nothing;

-- ---------- 2) RPC get_user_daily_limit_status (auth.uid()) ----------
-- Jour = UTC pour cohérence (pas de timezone utilisateur).
create or replace function public.get_user_daily_limit_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_trust text;
  v_limits record;
  v_responses_today int;
  v_reward_today bigint;
  v_withdrawals_today int;
  v_today_utc date;
  v_shared_device_users int;
  v_open_flags int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  v_today_utc := (now() at time zone 'UTC')::date;

  select trust_level into v_trust from public.users where id = v_uid;
  v_trust := coalesce(nullif(trim(v_trust), ''), 'Bronze');

  select max_valid_responses_per_day, max_reward_cents_per_day, max_withdrawal_requests_per_day
  into v_limits
  from public.trust_daily_limits
  where trust_level = v_trust;
  if v_limits is null then
    select max_valid_responses_per_day, max_reward_cents_per_day, max_withdrawal_requests_per_day
    into v_limits
    from public.trust_daily_limits
    where trust_level = 'Bronze';
  end if;
  if v_limits is null then
    return jsonb_build_object('error', 'limits_not_configured');
  end if;

  select count(*)::int, coalesce(sum(reward_cents), 0)::bigint
  into v_responses_today, v_reward_today
  from public.responses
  where user_id = v_uid and ((created_at at time zone 'UTC')::date = v_today_utc);

  select count(*)::int into v_withdrawals_today
  from public.withdrawals
  where user_id = v_uid and ((created_at at time zone 'UTC')::date = v_today_utc);

  select count(distinct ud2.user_id)::int into v_shared_device_users
  from public.user_devices ud1
  join public.user_devices ud2 on ud2.device_hash = ud1.device_hash and ud2.user_id <> ud1.user_id
  where ud1.user_id = v_uid;

  select count(*)::int into v_open_flags
  from public.flags
  where user_id = v_uid and status = 'open';

  return jsonb_build_object(
    'trust_level', v_trust,
    'valid_responses_today', v_responses_today,
    'reward_cents_today', v_reward_today,
    'withdrawal_requests_today', v_withdrawals_today,
    'max_valid_responses_per_day', v_limits.max_valid_responses_per_day,
    'max_reward_cents_per_day', v_limits.max_reward_cents_per_day,
    'max_withdrawal_requests_per_day', v_limits.max_withdrawal_requests_per_day,
    'remaining_valid_responses_today', greatest(0, v_limits.max_valid_responses_per_day - v_responses_today),
    'remaining_reward_cents_today', greatest(0, v_limits.max_reward_cents_per_day - v_reward_today::int),
    'remaining_withdrawal_requests_today', greatest(0, v_limits.max_withdrawal_requests_per_day - v_withdrawals_today),
    'shared_device_users_count', coalesce(v_shared_device_users, 0),
    'open_flags_count', coalesce(v_open_flags, 0)
  );
end;
$$;

grant execute on function public.get_user_daily_limit_status() to authenticated;

-- ---------- 2b) RPC admin : statut journalier pour un user_id (service_role) ----------
create or replace function public.get_admin_user_daily_limit_status(_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trust text;
  v_limits record;
  v_responses_today int;
  v_reward_today bigint;
  v_withdrawals_today int;
  v_today_utc date;
  v_shared_device_users int;
  v_open_flags int;
begin
  v_today_utc := (now() at time zone 'UTC')::date;

  select trust_level into v_trust from public.users where id = _user_id;
  v_trust := coalesce(nullif(trim(v_trust), ''), 'Bronze');

  select max_valid_responses_per_day, max_reward_cents_per_day, max_withdrawal_requests_per_day
  into v_limits
  from public.trust_daily_limits
  where trust_level = v_trust;
  if v_limits is null then
    select max_valid_responses_per_day, max_reward_cents_per_day, max_withdrawal_requests_per_day
    into v_limits from public.trust_daily_limits where trust_level = 'Bronze';
  end if;
  if v_limits is null then
    return jsonb_build_object('error', 'limits_not_configured');
  end if;

  select count(*)::int, coalesce(sum(reward_cents), 0)::bigint
  into v_responses_today, v_reward_today
  from public.responses
  where user_id = _user_id and ((created_at at time zone 'UTC')::date = v_today_utc);

  select count(*)::int into v_withdrawals_today
  from public.withdrawals
  where user_id = _user_id and ((created_at at time zone 'UTC')::date = v_today_utc);

  select count(distinct ud2.user_id)::int into v_shared_device_users
  from public.user_devices ud1
  join public.user_devices ud2 on ud2.device_hash = ud1.device_hash and ud2.user_id <> ud1.user_id
  where ud1.user_id = _user_id;

  select count(*)::int into v_open_flags
  from public.flags
  where user_id = _user_id and status = 'open';

  return jsonb_build_object(
    'trust_level', v_trust,
    'valid_responses_today', v_responses_today,
    'reward_cents_today', v_reward_today,
    'withdrawal_requests_today', v_withdrawals_today,
    'max_valid_responses_per_day', v_limits.max_valid_responses_per_day,
    'max_reward_cents_per_day', v_limits.max_reward_cents_per_day,
    'max_withdrawal_requests_per_day', v_limits.max_withdrawal_requests_per_day,
    'remaining_valid_responses_today', greatest(0, v_limits.max_valid_responses_per_day - v_responses_today),
    'remaining_reward_cents_today', greatest(0, v_limits.max_reward_cents_per_day - v_reward_today::int),
    'remaining_withdrawal_requests_today', greatest(0, v_limits.max_withdrawal_requests_per_day - v_withdrawals_today),
    'shared_device_users_count', coalesce(v_shared_device_users, 0),
    'open_flags_count', coalesce(v_open_flags, 0)
  );
end;
$$;

grant execute on function public.get_admin_user_daily_limit_status(uuid) to service_role;

-- ---------- 3) Trigger BEFORE INSERT responses : refuser si plafond dépassé ----------
create or replace function public.check_daily_limits_before_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trust text;
  v_limits record;
  v_responses_today int;
  v_reward_today bigint;
  v_today_utc date;
  v_campaign_reward int;
begin
  v_today_utc := (now() at time zone 'UTC')::date;

  select trust_level into v_trust from public.users where id = new.user_id;
  v_trust := coalesce(nullif(trim(v_trust), ''), 'Bronze');

  select max_valid_responses_per_day, max_reward_cents_per_day
  into v_limits
  from public.trust_daily_limits
  where trust_level = v_trust;
  if v_limits is null then
    select max_valid_responses_per_day, max_reward_cents_per_day
    into v_limits from public.trust_daily_limits where trust_level = 'Bronze';
  end if;
  if v_limits is null then
    return new;
  end if;

  select count(*)::int, coalesce(sum(reward_cents), 0)::bigint
  into v_responses_today, v_reward_today
  from public.responses
  where user_id = new.user_id and ((created_at at time zone 'UTC')::date = v_today_utc);

  select c.reward_cents into v_campaign_reward from public.campaigns c where c.id = new.campaign_id;

  if v_responses_today >= v_limits.max_valid_responses_per_day then
    raise exception 'daily_response_count_limit_reached' using errcode = 'P0001';
  end if;

  if (v_reward_today + coalesce(v_campaign_reward, 0)) > v_limits.max_reward_cents_per_day then
    raise exception 'daily_reward_limit_reached' using errcode = 'P0002';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_daily_limits_before_response on public.responses;
create trigger trg_check_daily_limits_before_response
  before insert on public.responses
  for each row execute function public.check_daily_limits_before_response();

-- ---------- 4) request_withdrawal : refuser si plafond demandes retrait dépassé ----------
create or replace function public.request_withdrawal(_amount_cents int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_available int;
  v_withdrawal_id uuid;
  v_frozen boolean;
  v_trust text;
  v_max_withdrawals int;
  v_withdrawals_today int;
  v_today_utc date;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select coalesce(urc.withdrawals_frozen, false) into v_frozen
  from public.user_risk_controls urc
  where urc.user_id = v_uid;
  if v_frozen then
    return jsonb_build_object('error', 'withdrawals_frozen');
  end if;

  v_today_utc := (now() at time zone 'UTC')::date;
  select trust_level into v_trust from public.users where id = v_uid;
  v_trust := coalesce(nullif(trim(v_trust), ''), 'Bronze');
  select max_withdrawal_requests_per_day into v_max_withdrawals
  from public.trust_daily_limits where trust_level = v_trust;
  if v_max_withdrawals is null then
    select max_withdrawal_requests_per_day into v_max_withdrawals from public.trust_daily_limits where trust_level = 'Bronze';
  end if;
  if v_max_withdrawals is not null then
    select count(*)::int into v_withdrawals_today
    from public.withdrawals
    where user_id = v_uid and ((created_at at time zone 'UTC')::date = v_today_utc);
    if v_withdrawals_today >= v_max_withdrawals then
      return jsonb_build_object('error', 'daily_withdrawal_request_limit_reached');
    end if;
  end if;

  if _amount_cents is null or _amount_cents < 500 then
    return jsonb_build_object('error', 'minimum_500_cents');
  end if;

  select available_cents into v_available
  from public.user_balances
  where user_id = v_uid;

  if v_available is null or v_available < _amount_cents then
    return jsonb_build_object('error', 'insufficient_balance');
  end if;

  insert into public.withdrawals (user_id, amount_cents, status, method)
  values (v_uid, _amount_cents, 'pending', 'manual')
  returning id into v_withdrawal_id;

  update public.user_balances
  set available_cents = available_cents - _amount_cents,
      updated_at = now()
  where user_id = v_uid;

  insert into public.ledger_entries (
    entity_type, entity_id, amount_cents, currency, reason, ref_id, status
  )
  values (
    'withdrawal', v_withdrawal_id, -_amount_cents, 'EUR', 'withdraw_request', v_withdrawal_id, 'pending'
  );

  return jsonb_build_object(
    'withdrawal_id', v_withdrawal_id,
    'amount_cents', _amount_cents,
    'status', 'pending'
  );
end;
$$;
