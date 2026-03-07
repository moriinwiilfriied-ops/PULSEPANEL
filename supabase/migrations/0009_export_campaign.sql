-- PulsePanel — Export réponses campagne (CSV/JSON) — org owner/editor
-- Exécuter après 0008_withdrawals_history.sql

create or replace function public.export_campaign_responses(_campaign_id uuid)
returns table (
  created_at timestamptz,
  response_id uuid,
  user_id uuid,
  answer jsonb,
  reward_cents int,
  payout_status text,
  is_valid bool,
  duration_ms int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_org_id := public.campaign_org(_campaign_id);
  if v_org_id is null then
    raise exception 'campaign_not_found';
  end if;

  if not public.can_manage_org(v_org_id) then
    raise exception 'forbidden';
  end if;

  return query
  select
    r.created_at,
    r.id as response_id,
    r.user_id,
    r.answer,
    r.reward_cents,
    r.payout_status,
    coalesce(r.is_valid, true) as is_valid,
    r.duration_ms
  from public.responses r
  where r.campaign_id = _campaign_id
  order by r.created_at asc;
end;
$$;

grant execute on function public.export_campaign_responses(uuid) to authenticated;
