-- PulsePanel — Billing ledger enrichi (Mission 17)
-- list_org_ledger retourne aussi campaign_title (question ou name de la campagne).

create or replace function public.list_org_ledger(_org_id uuid, _limit int default 100)
returns table (
  created_at timestamptz,
  amount_cents int,
  reason text,
  campaign_id uuid,
  campaign_title text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.can_manage_org(_org_id) then
    raise exception 'forbidden';
  end if;

  return query
    select
      e.created_at,
      e.amount_cents,
      e.reason,
      e.campaign_id,
      case
        when e.campaign_id is null then null
        else nullif(trim(coalesce(c.question, c.name, '')), '')
      end as campaign_title
    from public.org_ledger_entries e
    left join public.campaigns c on c.id = e.campaign_id
    where e.org_id = _org_id
    order by e.created_at desc
    limit greatest(_limit, 1);
end;
$$;

grant execute on function public.list_org_ledger(uuid, int) to authenticated;
