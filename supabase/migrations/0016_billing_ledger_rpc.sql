-- PulsePanel — Billing ledger UI (Mission 16)
-- RPC sécurisée pour lister les mouvements org_ledger_entries (pas de policy SELECT sur la table).

create or replace function public.list_org_ledger(_org_id uuid, _limit int default 100)
returns table (
  created_at timestamptz,
  amount_cents int,
  reason text,
  campaign_id uuid
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
    select e.created_at, e.amount_cents, e.reason, e.campaign_id
    from public.org_ledger_entries e
    where e.org_id = _org_id
    order by e.created_at desc
    limit greatest(_limit, 1);
end;
$$;

grant execute on function public.list_org_ledger(uuid, int) to authenticated;
