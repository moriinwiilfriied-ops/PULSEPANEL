-- PulsePanel — Campaign lifecycle (quota / progress / status)
-- Exécuter après 0002_orgs.sql

-- ---------- Contrainte status (active | paused | completed) ----------
-- Normaliser les anciennes valeurs (ex: 'live' -> 'active')
update public.campaigns set status = 'active' where status not in ('active', 'paused', 'completed');

alter table public.campaigns
  drop constraint if exists campaigns_status_check;

alter table public.campaigns
  add constraint campaigns_status_check
  check (status in ('active', 'paused', 'completed'));

-- ---------- Colonne responses_count ----------
alter table public.campaigns
  add column if not exists responses_count int not null default 0;

-- ---------- Index ----------
create index if not exists idx_campaigns_responses_count on public.campaigns(responses_count);

-- ---------- Trigger: après insert response -> incrémenter + compléter si quota atteint ----------
create or replace function public.fn_response_increment_campaign()
returns trigger as $$
begin
  update public.campaigns
  set responses_count = responses_count + 1
  where id = new.campaign_id;

  update public.campaigns
  set status = 'completed'
  where id = new.campaign_id and responses_count >= quota;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_response_increment_campaign on public.responses;
create trigger trg_response_increment_campaign
  after insert on public.responses
  for each row execute function public.fn_response_increment_campaign();

-- ---------- Backfill responses_count pour les campagnes existantes ----------
update public.campaigns c
set responses_count = coalesce((
  select count(*)::int from public.responses r where r.campaign_id = c.id
), 0);

-- Mettre completed si déjà au-dessus du quota
update public.campaigns
set status = 'completed'
where status = 'active' and responses_count >= quota;
