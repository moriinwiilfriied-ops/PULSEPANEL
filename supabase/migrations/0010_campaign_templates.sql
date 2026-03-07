-- PulsePanel — Templates campagne (création rapide)
-- Exécuter après 0009_export_campaign.sql

alter table public.campaigns
  add column if not exists template_key text;

alter table public.campaigns
  add column if not exists template_version int not null default 1;

create index if not exists idx_campaigns_template_key on public.campaigns(template_key);

-- Aucun changement RLS (reste org-scoped)
