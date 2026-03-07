-- PulsePanel — Org credits + pricing gate (Mission 14)
-- Wallet entreprise par org, coût campagne, blocage si crédit insuffisant.

-- ---------- 1) Table org_balances ----------
create table if not exists public.org_balances (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  available_cents int not null default 0,
  spent_cents int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- 2) Table org_ledger_entries (audit) ----------
create table if not exists public.org_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  amount_cents int not null,
  reason text not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_org_ledger_entries_org_created
  on public.org_ledger_entries(org_id, created_at desc);
create index if not exists idx_org_ledger_entries_campaign
  on public.org_ledger_entries(campaign_id);

-- ---------- 3) Trigger: création org -> org_balances si absent ----------
create or replace function public.ensure_org_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.org_balances (org_id, available_cents, spent_cents)
  values (new.id, 0, 0)
  on conflict (org_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_ensure_org_balance on public.orgs;
create trigger trg_ensure_org_balance
  after insert on public.orgs
  for each row execute function public.ensure_org_balance();

-- Backfill: orgs existantes sans ligne org_balances
insert into public.org_balances (org_id, available_cents, spent_cents)
select id, 0, 0 from public.orgs
on conflict (org_id) do nothing;

-- ---------- 4) Colonnes campaigns (coût + billing) ----------
alter table public.campaigns
  add column if not exists cost_per_response_cents int not null default 0;
alter table public.campaigns
  add column if not exists cost_total_cents int not null default 0;
alter table public.campaigns
  add column if not exists billing_status text not null default 'unbilled';

alter table public.campaigns
  drop constraint if exists campaigns_billing_status_check;
alter table public.campaigns
  add constraint campaigns_billing_status_check
  check (billing_status in ('unbilled', 'billed'));

-- ---------- 5) Pricing function (centimes) ----------
create or replace function public.compute_cost_per_response(_reward_cents int)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select ceil(_reward_cents * 1.7 + 35)::int;
$$;

-- ---------- 6) Billing trigger ----------
create or replace function public.bill_campaign_on_activate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost_per int;
  v_total int;
begin
  v_cost_per := public.compute_cost_per_response(coalesce(new.reward_cents, 0));
  v_total := coalesce(new.quota, 0) * v_cost_per;

  new.cost_per_response_cents := v_cost_per;
  new.cost_total_cents := v_total;

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

drop trigger if exists trg_bill_campaign_on_activate on public.campaigns;
create trigger trg_bill_campaign_on_activate
  before insert or update on public.campaigns
  for each row execute function public.bill_campaign_on_activate();

-- ---------- 7) RPC DEV topup org ----------
create or replace function public.org_topup_dev(_org_id uuid, _amount_cents int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available int;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'unauthorized');
  end if;
  if not public.can_manage_org(_org_id) then
    return jsonb_build_object('error', 'forbidden');
  end if;
  if _amount_cents is null or _amount_cents <= 0 then
    return jsonb_build_object('error', 'invalid_amount');
  end if;

  insert into public.org_balances (org_id, available_cents, spent_cents)
  values (_org_id, _amount_cents, 0)
  on conflict (org_id) do update
  set available_cents = public.org_balances.available_cents + _amount_cents,
      updated_at = now();

  select ob.available_cents into v_available
  from public.org_balances ob where ob.org_id = _org_id;

  insert into public.org_ledger_entries (org_id, amount_cents, reason)
  values (_org_id, _amount_cents, 'topup_dev');

  return jsonb_build_object(
    'org_id', _org_id,
    'added_cents', _amount_cents,
    'available_cents', v_available
  );
end;
$$;

grant execute on function public.org_topup_dev(uuid, int) to authenticated;

-- ---------- RLS org_balances ----------
alter table public.org_balances enable row level security;

drop policy if exists "org_balances_select_member" on public.org_balances;
create policy "org_balances_select_member"
  on public.org_balances for select
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_balances.org_id and m.user_id = auth.uid()
    )
  );

-- org_ledger_entries: pas de policy SELECT côté client (audit interne / RPC plus tard)
alter table public.org_ledger_entries enable row level security;
