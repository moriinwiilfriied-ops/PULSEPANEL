-- PulsePanel — Ajustement pricing + pas de recalcul si déjà billed (Mission 14.1)

-- ---------- 1) Nouvelle formule compute_cost_per_response ----------
drop function if exists public.compute_cost_per_response(int);

create or replace function public.compute_cost_per_response(_reward_cents int)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select ceil((_reward_cents::numeric * 1.35) + 10)::int;
$$;

-- ---------- 2) bill_campaign_on_activate: ne pas recalculer si déjà billed ----------
create or replace function public.bill_campaign_on_activate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost_per int;
  v_total int;
  v_skip_recalc boolean := false;
begin
  -- UPDATE déjà facturée et reste active : conserver les coûts existants
  if tg_op = 'UPDATE' and old.billing_status = 'billed' and old.status = 'active' and new.status = 'active' then
    v_skip_recalc := true;
    new.cost_per_response_cents := old.cost_per_response_cents;
    new.cost_total_cents := old.cost_total_cents;
  end if;

  if not v_skip_recalc then
    v_cost_per := public.compute_cost_per_response(coalesce(new.reward_cents, 0));
    v_total := coalesce(new.quota, 0) * v_cost_per;
    new.cost_per_response_cents := v_cost_per;
    new.cost_total_cents := v_total;
  else
    v_cost_per := new.cost_per_response_cents;
    v_total := new.cost_total_cents;
  end if;

  -- Billing uniquement au passage en active
  if new.status = 'active' and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status is distinct from 'active')) then
    if new.org_id is null then
      raise exception 'org_id required for active campaign';
    end if;

    if (select ob.available_cents from public.org_balances ob where ob.org_id = new.org_id) < v_total then
      raise exception 'insufficient_org_credit';
    end if;

    update public.org_balances
    set available_cents = available_cents - v_total,
        spent_cents = spent_cents + v_total,
        updated_at = now()
    where org_id = new.org_id;

    new.billing_status := 'billed';

    insert into public.org_ledger_entries (org_id, amount_cents, reason, campaign_id)
    values (new.org_id, -v_total, 'campaign_prepaid', new.id);
  end if;

  return new;
end;
$$;
