-- PulsePanel — Audit webhooks Stripe (journal des événements reçus)
-- Ne remplace pas l’idempotence métier (org_topups / stripe_checkout_session_id).
-- Accès serveur uniquement (RLS activé, pas de policy = service role only).

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  event_id text not null,
  event_type text not null,
  livemode boolean,
  api_version text,
  created_ts timestamptz,
  received_at timestamptz not null default now(),
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'error', 'duplicate')),
  processing_error text,
  processed_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  org_id uuid references public.orgs(id) on delete set null,
  payload_summary jsonb,
  source_route text default '/api/stripe/webhook',
  unique (provider, event_id)
);

create index idx_webhook_events_received_at
  on public.webhook_events(received_at desc);
create index idx_webhook_events_event_type
  on public.webhook_events(event_type);
create index idx_webhook_events_processing_status
  on public.webhook_events(processing_status);
create index idx_webhook_events_stripe_checkout_session_id
  on public.webhook_events(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create index idx_webhook_events_stripe_payment_intent_id
  on public.webhook_events(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table public.webhook_events enable row level security;
-- Aucune policy : lecture/écriture via service role uniquement.
