-- PulsePanel — KPI minimum pilot (temps quota, repeat baseline, org/admin KPIs)
-- Pas de stack analytics externe ; calculs à partir des tables existantes.

-- ---------- 1) get_campaign_time_to_quota(_campaign_id) ----------
-- Pour une campagne avec quota atteint : date de la réponse « quota-ème », durée depuis created_at campagne.
create or replace function public.get_campaign_time_to_quota(_campaign_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_org_id uuid;
  v_quota int;
  v_campaign_created_at timestamptz;
  v_quota_reached_at timestamptz;
  v_responses_count int;
begin
  if auth.uid() is null then return null; end if;

  select c.org_id, c.quota, c.created_at, c.responses_count
  into v_org_id, v_quota, v_campaign_created_at, v_responses_count
  from public.campaigns c
  where c.id = _campaign_id;

  if v_org_id is null or not public.can_manage_org(v_org_id) then
    return null;
  end if;

  if v_responses_count is null or v_responses_count < v_quota or v_quota <= 0 then
    return jsonb_build_object(
      'quota_reached', false,
      'campaign_created_at', v_campaign_created_at,
      'responses_count', coalesce(v_responses_count, 0),
      'quota', v_quota
    );
  end if;

  select r.created_at into v_quota_reached_at
  from public.responses r
  where r.campaign_id = _campaign_id
  order by r.created_at asc
  offset (v_quota - 1)
  limit 1;

  if v_quota_reached_at is null then
    return jsonb_build_object('quota_reached', false, 'campaign_created_at', v_campaign_created_at, 'quota', v_quota);
  end if;

  return jsonb_build_object(
    'quota_reached', true,
    'campaign_created_at', v_campaign_created_at,
    'quota_reached_at', v_quota_reached_at,
    'time_to_quota_seconds', round(extract(epoch from (v_quota_reached_at - v_campaign_created_at))::numeric, 0),
    'quota', v_quota,
    'responses_count', v_responses_count
  );
end;
$$;

grant execute on function public.get_campaign_time_to_quota(uuid) to authenticated;

-- ---------- 2) get_org_repeat_baseline(_org_id) ----------
create or replace function public.get_org_repeat_baseline(_org_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_campaigns_count int;
  v_completed_count int;
begin
  if auth.uid() is null then return null; end if;
  if not public.can_manage_org(_org_id) then return null; end if;

  select count(*)::int, count(*) filter (where status = 'completed')::int
  into v_campaigns_count, v_completed_count
  from public.campaigns
  where org_id = _org_id;

  return jsonb_build_object(
    'campaigns_count', coalesce(v_campaigns_count, 0),
    'campaigns_completed_count', coalesce(v_completed_count, 0),
    'campaigns_after_first', greatest(0, coalesce(v_campaigns_count, 0) - 1),
    'repeat_eligible', (coalesce(v_completed_count, 0) >= 1),
    'repeat_positive', (coalesce(v_campaigns_count, 0) >= 2)
  );
end;
$$;

grant execute on function public.get_org_repeat_baseline(uuid) to authenticated;

-- ---------- 3) get_org_pilot_kpis(_org_id) ----------
create or replace function public.get_org_pilot_kpis(_org_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_active int;
  v_completed int;
  v_total_responses bigint;
  v_credit_cents int;
  v_avg_ttq_sec numeric;
  v_avg_pct_valid numeric;
  v_repeat jsonb;
  v_ttq_sum numeric := 0;
  v_ttq_n int := 0;
  v_camp record;
  v_ttq jsonb;
  v_sec numeric;
begin
  if auth.uid() is null then return null; end if;
  if not public.can_manage_org(_org_id) then return null; end if;

  select
    count(*) filter (where status = 'active')::int,
    count(*) filter (where status = 'completed')::int,
    coalesce(sum(responses_count), 0)::bigint
  into v_active, v_completed, v_total_responses
  from public.campaigns
  where org_id = _org_id;

  select available_cents into v_credit_cents
  from public.org_balances
  where org_id = _org_id;

  v_repeat := public.get_org_repeat_baseline(_org_id);

  -- Moyenne temps pour quota (campagnes terminées uniquement)
  for v_camp in
    select c.id from public.campaigns c
    where c.org_id = _org_id and c.status = 'completed'
      and c.responses_count >= c.quota and c.quota > 0
  loop
    v_ttq := public.get_campaign_time_to_quota(v_camp.id);
    if (v_ttq->>'quota_reached')::boolean and (v_ttq->'time_to_quota_seconds') is not null then
      v_sec := (v_ttq->>'time_to_quota_seconds')::numeric;
      v_ttq_sum := v_ttq_sum + v_sec;
      v_ttq_n := v_ttq_n + 1;
    end if;
  end loop;

  v_avg_ttq_sec := case when v_ttq_n > 0 then round(v_ttq_sum / v_ttq_n, 0) else null end;

  -- Qualité moyenne (campagnes de l'org avec au moins une réponse)
  select round(avg(q.pct_valid)::numeric, 1) into v_avg_pct_valid
  from public.campaign_quality_stats q
  join public.campaigns c on c.id = q.campaign_id and c.org_id = _org_id
  where q.total_responses > 0;

  return jsonb_build_object(
    'active_campaigns', coalesce(v_active, 0),
    'completed_campaigns', coalesce(v_completed, 0),
    'total_responses', coalesce(v_total_responses, 0),
    'credit_available_cents', coalesce(v_credit_cents, 0),
    'avg_time_to_quota_seconds', v_avg_ttq_sec,
    'avg_pct_valid', v_avg_pct_valid,
    'repeat', v_repeat
  );
end;
$$;

grant execute on function public.get_org_pilot_kpis(uuid) to authenticated;

-- ---------- 4) get_admin_pilot_kpis() — service_role ----------
create or replace function public.get_admin_pilot_kpis()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_flags_open int;
  v_webhook_errors_24h int;
  v_webhook_errors_7d int;
  v_withdrawals_pending int;
  v_withdrawals_paid_7d int;
  v_orgs_eligible bigint;
  v_orgs_positive bigint;
  v_since_24h timestamptz;
  v_since_7d timestamptz;
begin
  v_since_24h := now() - interval '24 hours';
  v_since_7d := now() - interval '7 days';

  select count(*)::int into v_flags_open from public.flags where status = 'open';
  select count(*)::int into v_webhook_errors_24h from public.webhook_events where received_at >= v_since_24h and processing_status = 'error';
  select count(*)::int into v_webhook_errors_7d from public.webhook_events where received_at >= v_since_7d and processing_status = 'error';
  select count(*)::int into v_withdrawals_pending from public.withdrawals where status = 'pending';
  select count(*)::int into v_withdrawals_paid_7d from public.withdrawals where status = 'paid' and decided_at >= v_since_7d;

  select count(*) into v_orgs_eligible
  from (select 1 from public.campaigns where status = 'completed' group by org_id) t;
  select count(*) into v_orgs_positive
  from (select org_id from public.campaigns group by org_id having count(*) >= 2) t;

  return jsonb_build_object(
    'flags_open', v_flags_open,
    'webhook_errors_24h', v_webhook_errors_24h,
    'webhook_errors_7d', v_webhook_errors_7d,
    'withdrawals_pending', v_withdrawals_pending,
    'withdrawals_paid_7d', v_withdrawals_paid_7d,
    'orgs_repeat_eligible', (v_orgs_eligible),
    'orgs_repeat_positive', (v_orgs_positive),
    'repeat_rate', case when v_orgs_eligible > 0 then round((v_orgs_positive::numeric / v_orgs_eligible), 2) else null end
  );
end;
$$;

grant execute on function public.get_admin_pilot_kpis() to service_role;
