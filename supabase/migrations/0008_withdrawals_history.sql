-- PulsePanel — Historique retraits (payés/refusés) pour dashboard
-- Exécuter après 0007_withdrawals.sql

create or replace function public.list_recent_withdrawals(_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  amount_cents int,
  status text,
  created_at timestamptz,
  decided_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;

  return query
  select w.id, w.user_id, w.amount_cents, w.status, w.created_at, w.decided_at
  from public.withdrawals w
  where w.status in ('paid', 'rejected')
    and public.can_manage_withdrawal(w.user_id)
  order by w.decided_at desc nulls last, w.created_at desc
  limit greatest(_limit, 1);
end;
$$;

grant execute on function public.list_recent_withdrawals(int) to authenticated;
