-- PulsePanel — Traçabilité duplication campagne (repeat / V2)
-- Permet de distinguer une campagne créée from scratch d'une copie (V2, relance).
-- Usage : voir docs/campaign-duplication-repeat-runbook.md

alter table public.campaigns
  add column if not exists source_campaign_id uuid null
  references public.campaigns(id) on delete set null;

comment on column public.campaigns.source_campaign_id is
  'Si non null : cette campagne a été créée par duplication depuis la campagne id. Utilisé pour mesure repeat / V2.';

create index if not exists idx_campaigns_source_campaign_id
  on public.campaigns(source_campaign_id)
  where source_campaign_id is not null;
