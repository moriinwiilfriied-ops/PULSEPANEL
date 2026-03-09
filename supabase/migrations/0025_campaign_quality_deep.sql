-- PulsePanel — Vue qualité campagne enrichie (temps moyen, flags count)
-- Pour affichage dashboard sans dupliquer la logique. Pas d'IA.

create or replace function public.get_campaign_quality_deep(_campaign_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_org_id uuid;
  v_avg_ms numeric;
  v_flags_count int;
  v_total int;
begin
  if auth.uid() is null then return null; end if;
  v_org_id := public.campaign_org(_campaign_id);
  if v_org_id is null or not public.can_manage_org(v_org_id) then return null; end if;

  select
    round(avg(r.duration_ms)::numeric, 0),
    count(*)::int
  into v_avg_ms, v_total
  from public.responses r
  where r.campaign_id = _campaign_id and r.duration_ms is not null;

  select count(*)::int into v_flags_count
  from public.flags f
  join public.responses r on r.id = f.response_id
  where r.campaign_id = _campaign_id;

  return jsonb_build_object(
    'avg_duration_ms', v_avg_ms,
    'responses_with_duration', coalesce(v_total, 0),
    'flags_count', coalesce(v_flags_count, 0)
  );
end;
$$;

grant execute on function public.get_campaign_quality_deep(uuid) to authenticated;

comment on function public.get_campaign_quality_deep(uuid) is
  'Vue qualité enrichie: avg_duration_ms, flags_count. Complète get_campaign_quality_stats pour la page détail campagne.';
