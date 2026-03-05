-- PulsePanel — Multi-tenant Orgs + RLS propre
-- Exécuter après 0001_init.sql (Supabase Dashboard → SQL Editor)

-- ---------- Tables ----------
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

create table if not exists public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  primary key (org_id, user_id)
);

create index if not exists idx_org_members_user_id on public.org_members(user_id);

-- Trigger: créateur de l'org devient owner
create or replace function public.fn_org_created_add_owner()
returns trigger as $$
begin
  if new.created_by is not null then
    insert into public.org_members (org_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (org_id, user_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_org_created_add_owner
  after insert on public.orgs
  for each row execute function public.fn_org_created_add_owner();

-- ---------- Alter campaigns ----------
alter table public.campaigns
  add column if not exists org_id uuid references public.orgs(id) on delete cascade;

create index if not exists idx_campaigns_org_id on public.campaigns(org_id);

-- responses: index campaign_id existe déjà en 0001
-- create index if not exists idx_responses_campaign_id on public.responses(campaign_id);

-- ---------- RLS: supprimer policies DEV permissives ----------
drop policy if exists "campaigns_select" on public.campaigns;
drop policy if exists "campaigns_insert" on public.campaigns;
drop policy if exists "campaigns_update" on public.campaigns;
drop policy if exists "campaigns_delete" on public.campaigns;

drop policy if exists "responses_select" on public.responses;

-- ---------- RLS: orgs ----------
alter table public.orgs enable row level security;

create policy "orgs_select_member"
  on public.orgs for select
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = orgs.id and m.user_id = auth.uid()
    )
  );

create policy "orgs_insert_authenticated"
  on public.orgs for insert to authenticated
  with check (true);

create policy "orgs_update_owner"
  on public.orgs for update
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = orgs.id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

create policy "orgs_delete_owner"
  on public.orgs for delete
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = orgs.id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- ---------- RLS: org_members ----------
alter table public.org_members enable row level security;

create policy "org_members_select_member"
  on public.org_members for select
  using (
    exists (
      select 1 from public.org_members m2
      where m2.org_id = org_members.org_id and m2.user_id = auth.uid()
    )
  );

-- insert: owner existant peut ajouter des membres, OU premier membre (créateur via trigger)
create policy "org_members_insert_owner"
  on public.org_members for insert
  with check (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role = 'owner'
    )
    or (
      user_id = auth.uid()
      and role = 'owner'
      and not exists (select 1 from public.org_members m2 where m2.org_id = org_members.org_id)
    )
  );

create policy "org_members_delete_owner"
  on public.org_members for delete
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- ---------- RLS: campaigns (multi-tenant) ----------
-- select: campagnes actives (feed public) OU membre de l'org
create policy "campaigns_select_active_or_member"
  on public.campaigns for select
  using (
    status = 'active'
    or (
      org_id is not null
      and exists (
        select 1 from public.org_members m
        where m.org_id = campaigns.org_id and m.user_id = auth.uid()
      )
    )
  );

-- insert/update/delete: membre (owner ou editor) de l'org
create policy "campaigns_insert_member"
  on public.campaigns for insert
  with check (
    org_id is not null
    and exists (
      select 1 from public.org_members m
      where m.org_id = campaigns.org_id and m.user_id = auth.uid() and m.role in ('owner', 'editor')
    )
  );

create policy "campaigns_update_member"
  on public.campaigns for update
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = campaigns.org_id and m.user_id = auth.uid() and m.role in ('owner', 'editor')
    )
  );

create policy "campaigns_delete_member"
  on public.campaigns for delete
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = campaigns.org_id and m.user_id = auth.uid() and m.role in ('owner', 'editor')
    )
  );

-- ---------- RLS: responses ----------
-- insert: inchangé (user_id = auth.uid())
-- select: user peut lire ses réponses OU membre de l'org de la campagne (dashboard)
create policy "responses_select_own_or_org"
  on public.responses for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.campaigns c
      join public.org_members m on m.org_id = c.org_id and m.user_id = auth.uid()
      where c.id = responses.campaign_id
    )
  );

-- users / user_balances / ledger_entries / flags inchangés (pas de drop policy)
