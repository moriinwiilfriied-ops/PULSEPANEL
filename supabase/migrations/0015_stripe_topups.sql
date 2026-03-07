-- PulsePanel — Stripe topups (Mission 15)
-- Table pour idempotence: 1 paiement = 1 crédit (pas de double credit via webhook).

create table if not exists public.org_topups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  stripe_checkout_session_id text unique not null,
  stripe_payment_intent_id text unique,
  amount_cents int not null,
  currency text not null default 'eur',
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed')),
  created_at timestamptz default now() not null,
  paid_at timestamptz
);

create index if not exists idx_org_topups_org_created
  on public.org_topups(org_id, created_at desc);

-- RLS: pas de policies (accès serveur/webhook uniquement)
alter table public.org_topups enable row level security;

-- RPC serveur: créditer org_balances + ledger (appelé par le webhook après insert org_topups)
create or replace function public.org_credit_topup(
  p_org_id uuid,
  p_amount_cents int,
  p_reason text default 'topup_stripe'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.org_balances
  set available_cents = available_cents + p_amount_cents,
      updated_at = now()
  where org_id = p_org_id;

  if not found then
    insert into public.org_balances (org_id, available_cents, spent_cents)
    values (p_org_id, p_amount_cents, 0)
    on conflict (org_id) do update
    set available_cents = public.org_balances.available_cents + p_amount_cents,
        updated_at = now();
  end if;

  insert into public.org_ledger_entries (org_id, amount_cents, reason, campaign_id)
  values (p_org_id, p_amount_cents, p_reason, null);
end;
$$;
