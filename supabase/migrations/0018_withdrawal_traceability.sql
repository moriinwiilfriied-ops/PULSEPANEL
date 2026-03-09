-- PulsePanel — Traçabilité retraits admin (rejection_reason, external_reference, payment_channel, admin_note)
-- Migration minimale : 4 colonnes + RPC admin uniquement. Ne modifie pas decide_withdrawal (flow org inchangé).

-- ---------- 1) Colonnes traçabilité ----------
alter table public.withdrawals
  add column if not exists rejection_reason text;

alter table public.withdrawals
  add column if not exists external_reference text;

alter table public.withdrawals
  add column if not exists payment_channel text;

alter table public.withdrawals
  add column if not exists admin_note text;

-- ---------- 2) RPC admin_decide_withdrawal (appelée via service_role uniquement) ----------
-- Même logique que decide_withdrawal + mise à jour des champs de traçabilité.
-- decided_by laissé à null pour les décisions admin (pas d'auth user).
create or replace function public.admin_decide_withdrawal(
  _withdrawal_id uuid,
  _decision text,
  _rejection_reason text default null,
  _external_reference text default null,
  _payment_channel text default null,
  _admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.withdrawals%rowtype;
begin
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

  if _decision = 'rejected' then
    if trim(coalesce(_rejection_reason, '')) = '' then
      return jsonb_build_object('error', 'rejection_reason_required');
    end if;
    if trim(coalesce(_admin_note, '')) = '' then
      return jsonb_build_object('error', 'admin_note_required');
    end if;

    update public.user_balances
    set available_cents = available_cents + v_row.amount_cents,
        updated_at = now()
    where user_id = v_row.user_id;

    update public.withdrawals
    set status = 'rejected',
        decided_at = now(),
        decided_by = null,
        rejection_reason = trim(_rejection_reason),
        admin_note = trim(_admin_note)
    where id = _withdrawal_id;

    update public.ledger_entries
    set status = 'rejected'
    where entity_type = 'withdrawal' and entity_id = _withdrawal_id;
  else
    -- paid
    if trim(coalesce(_external_reference, '')) = '' then
      return jsonb_build_object('error', 'external_reference_required');
    end if;
    if trim(coalesce(_payment_channel, '')) = '' then
      return jsonb_build_object('error', 'payment_channel_required');
    end if;
    if trim(coalesce(_admin_note, '')) = '' then
      return jsonb_build_object('error', 'admin_note_required');
    end if;

    update public.withdrawals
    set status = 'paid',
        decided_at = now(),
        decided_by = null,
        external_reference = trim(_external_reference),
        payment_channel = trim(_payment_channel),
        admin_note = trim(_admin_note)
    where id = _withdrawal_id;

    update public.ledger_entries
    set status = 'paid'
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

-- Appel réservé au backend (service_role). Ne pas accorder à authenticated.
grant execute on function public.admin_decide_withdrawal(uuid, text, text, text, text, text) to service_role;
