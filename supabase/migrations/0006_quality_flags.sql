-- PulsePanel — Qualité / fraude V0 : is_valid, flags, trust_score, stats campagne
-- Exécuter après 0005_validate_payouts_hardening.sql

-- ---------- 1) responses : is_valid ----------
alter table public.responses
  add column if not exists is_valid boolean not null default true;

-- ---------- 2) Trigger : qualité après insert response ----------
create or replace function public.handle_response_quality()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_too_fast boolean;
  v_empty boolean;
  v_invalid boolean;
begin
  v_too_fast := (new.duration_ms is not null and new.duration_ms < 1200);
  v_empty := (
    new.answer is null
    or trim(coalesce(new.answer->>'value', '')) = ''
  );
  v_invalid := v_too_fast or v_empty;

  if v_invalid then
    update public.responses set is_valid = false where id = new.id;
    if v_too_fast then
      insert into public.flags (user_id, response_id, reason, severity, status)
      values (new.user_id, new.id, 'too_fast', 2, 'open');
    end if;
    if v_empty then
      insert into public.flags (user_id, response_id, reason, severity, status)
      values (new.user_id, new.id, 'empty_answer', 3, 'open');
    end if;
  end if;

  update public.users
  set
    trust_score = greatest(0, trust_score + case when v_invalid then -3 else 1 end),
    trust_level = case
      when (trust_score + case when v_invalid then -3 else 1 end) >= 200 then 'Or'
      when (trust_score + case when v_invalid then -3 else 1 end) >= 50 then 'Argent'
      else 'Bronze'
    end
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_response_quality on public.responses;
create trigger trg_response_quality
  after insert on public.responses
  for each row execute function public.handle_response_quality();

-- ---------- 3) Vue stats qualité par campagne ----------
create or replace view public.campaign_quality_stats as
select
  r.campaign_id,
  count(*)::int as total_responses,
  count(*) filter (where r.is_valid)::int as valid_responses,
  count(*) filter (where not r.is_valid)::int as invalid_responses,
  round(100.0 * count(*) filter (where r.is_valid) / nullif(count(*)::numeric, 0), 1) as pct_valid,
  round(100.0 * (
    select count(*) from public.flags f
    join public.responses r2 on r2.id = f.response_id
    where r2.campaign_id = r.campaign_id and f.reason = 'too_fast'
  )::numeric / nullif(count(*)::numeric, 0), 1) as pct_too_fast,
  round(100.0 * (
    select count(*) from public.flags f
    join public.responses r2 on r2.id = f.response_id
    where r2.campaign_id = r.campaign_id and f.reason = 'empty_answer'
  )::numeric / nullif(count(*)::numeric, 0), 1) as pct_empty
from public.responses r
group by r.campaign_id;

-- RPC dashboard : retourne une ligne campaign_quality_stats si l'utilisateur peut gérer l'org.
create or replace function public.get_campaign_quality_stats(_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then return null; end if;
  v_org_id := public.campaign_org(_campaign_id);
  if v_org_id is null or not public.can_manage_org(v_org_id) then return null; end if;
  return (select to_jsonb(q) from public.campaign_quality_stats q where q.campaign_id = _campaign_id limit 1);
end;
$$;

grant execute on function public.get_campaign_quality_stats(uuid) to authenticated;

-- RLS : la vue lit responses (et flags via sous-requêtes). Les policies sur responses s’appliquent.
-- Aucune policy sur la vue ; l’accès passe par les tables sous-jacentes (org_members voit les réponses de l’org).
