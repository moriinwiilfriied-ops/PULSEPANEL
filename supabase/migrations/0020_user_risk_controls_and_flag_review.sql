-- PulsePanel — Contrôle fraude/support : gel retraits + revue flags (admin-only)
-- Table admin-only pour état de gel cashout. Pas de policy = accès service_role uniquement.

-- ---------- 1) Table user_risk_controls (1 ligne max par user) ----------
create table if not exists public.user_risk_controls (
  user_id uuid primary key references public.users(id) on delete cascade,
  withdrawals_frozen boolean not null default false,
  withdrawals_frozen_reason text,
  withdrawals_frozen_at timestamptz,
  withdrawals_frozen_by text,
  admin_note text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_risk_controls_withdrawals_frozen
  on public.user_risk_controls(withdrawals_frozen) where withdrawals_frozen = true;

alter table public.user_risk_controls enable row level security;
-- Aucune policy : lecture/écriture service role uniquement.

-- ---------- 2) Flags : colonnes revue admin ----------
alter table public.flags
  add column if not exists admin_note text;

alter table public.flags
  add column if not exists reviewed_at timestamptz;

alter table public.flags
  add column if not exists reviewed_by text;

-- ---------- 3) request_withdrawal : refuser si gel actif ----------
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
