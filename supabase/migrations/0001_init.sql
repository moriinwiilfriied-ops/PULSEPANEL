-- PulsePanel — Init schema + RLS (DEV permissives)
-- Exécuter dans Supabase Dashboard → SQL Editor

create extension if not exists "pgcrypto";

-- users (profil onboarding)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null,
  age_bucket text,
  region text,
  tags jsonb default '[]'::jsonb,
  onboarding_completed bool default false,
  trust_level text default 'Bronze',
  trust_score int default 0
);

-- campaigns
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text,
  template text not null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  targeting jsonb not null default '{}'::jsonb,
  quota int not null,
  reward_cents int not null,
  price_cents int not null,
  status text not null default 'active',
  created_at timestamptz default now() not null
);

create index idx_campaigns_status on public.campaigns(status);

-- responses
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null,
  answer jsonb not null,
  duration_ms int,
  created_at timestamptz default now() not null
);

create index idx_responses_campaign_id on public.responses(campaign_id);
create index idx_responses_user_id on public.responses(user_id);

-- user_balances (wallet — utilisé côté serveur plus tard)
create table public.user_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pending_cents int default 0 not null,
  available_cents int default 0 not null,
  updated_at timestamptz default now() not null
);

-- ledger_entries (inaccessible client, RLS sans policy)
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  amount_cents int not null,
  currency text default 'EUR',
  reason text,
  ref_id uuid,
  status text,
  created_at timestamptz default now() not null
);

-- flags (modération)
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  response_id uuid,
  reason text,
  severity int,
  status text,
  created_at timestamptz default now() not null
);

-- Trigger: après insert users -> créer user_balances si absent
create or replace function public.fn_create_user_balance()
returns trigger as $$
begin
  insert into public.user_balances (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_users_create_balance
  after insert on public.users
  for each row execute function public.fn_create_user_balance();

-- ---------- RLS ----------
alter table public.users enable row level security;
alter table public.campaigns enable row level security;
alter table public.responses enable row level security;
alter table public.user_balances enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.flags enable row level security;

-- users: select/insert/update seulement si id = auth.uid()
create policy "users_select_own" on public.users for select using (id = auth.uid());
create policy "users_insert_own" on public.users for insert with check (id = auth.uid());
create policy "users_update_own" on public.users for update using (id = auth.uid());

-- user_balances: select seulement si user_id = auth.uid()
create policy "user_balances_select_own" on public.user_balances for select using (user_id = auth.uid());

-- campaigns: select pour authenticated; insert/update/delete pour authenticated (DEV)
create policy "campaigns_select" on public.campaigns for select to authenticated using (true);
create policy "campaigns_insert" on public.campaigns for insert to authenticated with check (true);
create policy "campaigns_update" on public.campaigns for update to authenticated using (true);
create policy "campaigns_delete" on public.campaigns for delete to authenticated using (true);

-- responses: insert seulement si user_id = auth.uid(); select pour authenticated (DEV)
create policy "responses_insert_own" on public.responses for insert with check (user_id = auth.uid());
create policy "responses_select" on public.responses for select to authenticated using (true);

-- ledger_entries: aucune policy (inaccessible client)
-- flags: aucune policy (inaccessible client)
