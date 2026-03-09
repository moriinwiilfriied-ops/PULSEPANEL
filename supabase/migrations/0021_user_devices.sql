-- PulsePanel — Fondation user_devices (identité d’installation, fraude/support)
-- Écriture via RPC register_user_device (auth.uid()). Lecture admin uniquement (service role).
-- On ne stocke que device_hash (hash du token d’installation), pas l’identifiant brut.

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,
  platform text,
  app_version text,
  created_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint user_devices_user_device_unique unique (user_id, device_hash)
);

create index if not exists idx_user_devices_user_id on public.user_devices(user_id);
create index if not exists idx_user_devices_device_hash on public.user_devices(device_hash);

comment on table public.user_devices is 'Installations connues par user (hash uniquement). Pas de lecture client globale.';

-- Pas de RLS : pas d’accès client direct. Lecture/écriture admin via service role ; écriture user via RPC.
alter table public.user_devices enable row level security;

-- Aucune policy : les clients ne peuvent ni lire ni écrire. Seule la RPC (security definer) et le service role accèdent.
-- (On ne crée pas de policy pour authenticated, pour éviter toute lecture globale.)

-- RPC : enregistrement / mise à jour d’un device par l’utilisateur courant.
-- _install_token : identifiant d’installation envoyé par le client (ex. UUID). Jamais stocké en clair.
create or replace function public.register_user_device(
  _install_token text,
  _platform text default null,
  _app_version text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_hash text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  _install_token := trim(coalesce(_install_token, ''));
  if _install_token = '' then
    raise exception 'install_token_required';
  end if;

  v_hash := encode(digest(_install_token, 'sha256'), 'hex');

  insert into public.user_devices (user_id, device_hash, platform, app_version, first_seen_at, last_seen_at)
  values (v_user_id, v_hash, nullif(trim(_platform), ''), nullif(trim(_app_version), ''), now(), now())
  on conflict (user_id, device_hash) do update set
    platform = coalesce(nullif(trim(excluded.platform), ''), user_devices.platform),
    app_version = coalesce(nullif(trim(excluded.app_version), ''), user_devices.app_version),
    last_seen_at = now();
end;
$$;

grant execute on function public.register_user_device(text, text, text) to authenticated;
revoke all on table public.user_devices from anon, authenticated;
