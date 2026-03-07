-- PulsePanel — Retraits : demandes + approbation dashboard
-- Exécuter après 0006_quality_flags.sql

-- ---------- 1) Table withdrawals ----------
create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  method text default 'manual',
  note text,
  created_at timestamptz default now() not null,
  decided_at timestamptz,
  decided_by uuid references auth.users(id)
);

create index idx_withdrawals_user_created on public.withdrawals(user_id, created_at desc);
create index idx_withdrawals_status_created on public.withdrawals(status, created_at desc);

-- ---------- 2) RLS ----------
alter table public.withdrawals enable row level security;

-- User: select et insert ses propres lignes, pas d'update
create policy "withdrawals_select_own"
  on public.withdrawals for select
  using (user_id = auth.uid());

create policy "withdrawals_insert_own"
  on public.withdrawals for insert
  with check (user_id = auth.uid());

-- Pas de policy update/delete pour les users ; le dashboard passe par RPC (SECURITY DEFINER).

-- ---------- 3) RPC request_withdrawal ----------
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
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('error', 'not_authenticated');
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

-- ---------- 4) Helper : l'utilisateur a-t-il répondu à une campagne d'une org que je gère ? ----------
create or replace function public.can_manage_withdrawal(_withdrawal_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.responses r
    join public.campaigns c on c.id = r.campaign_id
    join public.org_members m on m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('owner', 'editor')
    where r.user_id = _withdrawal_user_id
    limit 1
  );
$$;

-- ---------- 5) RPC list_pending_withdrawals (dashboard) ----------
create or replace function public.list_pending_withdrawals()
returns table (
  id uuid,
  user_id uuid,
  amount_cents int,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;

  return query
  select w.id, w.user_id, w.amount_cents, w.status, w.created_at
  from public.withdrawals w
  where w.status = 'pending'
    and public.can_manage_withdrawal(w.user_id)
  order by w.created_at asc
  limit 50;
end;
$$;

-- ---------- 6) RPC decide_withdrawal ----------
create or replace function public.decide_withdrawal(_withdrawal_id uuid, _decision text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.withdrawals%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if _decision is null or _decision not in ('paid', 'rejected') then
    return jsonb_build_object('error', 'invalid_decision');
  end if;

  select * into v_row from public.withdrawals where id = _withdrawal_id;
  if v_row.id is null then
    return jsonb_build_object('error', 'withdrawal_not_found');
  end if;

  if v_row.status != 'pending' then
    return jsonb_build_object('error', 'withdrawal_not_pending');
  end if;

  if not public.can_manage_withdrawal(v_row.user_id) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  if _decision = 'paid' then
    update public.withdrawals
    set status = 'paid', decided_by = v_uid, decided_at = now()
    where id = _withdrawal_id;

    update public.ledger_entries
    set status = 'paid'
    where entity_type = 'withdrawal' and entity_id = _withdrawal_id;
  else
    -- rejected : rembourser available_cents
    update public.user_balances
    set available_cents = available_cents + v_row.amount_cents,
        updated_at = now()
    where user_id = v_row.user_id;

    update public.withdrawals
    set status = 'rejected', decided_by = v_uid, decided_at = now()
    where id = _withdrawal_id;

    update public.ledger_entries
    set status = 'rejected'
    where entity_type = 'withdrawal' and entity_id = _withdrawal_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', _decision,
    'user_id', v_row.user_id,
    'amount_cents', v_row.amount_cents
  );
end;
$$;

grant execute on function public.request_withdrawal(int) to authenticated;
grant execute on function public.can_manage_withdrawal(uuid) to authenticated;
grant execute on function public.list_pending_withdrawals() to authenticated;
grant execute on function public.decide_withdrawal(uuid, text) to authenticated;
