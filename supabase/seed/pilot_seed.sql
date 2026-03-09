-- PulsePanel — Seed pilot (démo / staging uniquement)
-- NE PAS exécuter en production. À lancer via scripts/pilot-seed.ps1 après garde-fou.

-- Org pilot (id fixe pour reproductibilité et reset)
insert into public.orgs (id, name, created_by)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'PulsePanel Pilot',
  null
)
on conflict (id) do update set name = excluded.name;

-- org_balances créé par trigger trg_ensure_org_balance à l'insert org (déjà fait ci-dessus)

-- Campagnes seed : status paused pour ne pas déclencher le billing. Préfixe [Pilot] pour repérage.
-- price_cents = ceil(reward_cents * 1.35 + 10) (formule 0012)

insert into public.campaigns (
  org_id, name, template, template_key, template_version, question, options, targeting,
  quota, reward_cents, price_cents, status, billing_status
)
select v.org_id, v.name, v.template, v.template_key, v.template_version, v.question, v.options, v.targeting,
  v.quota, v.reward_cents, v.price_cents, v.status, v.billing_status
from (values
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '[Pilot] A/B Packaging',
    'A/B',
    'ab_packaging',
    1,
    'Quel visuel préférez-vous ?',
    '["Visuel A", "Visuel B"]'::jsonb,
    '{"ageMin":18,"ageMax":65,"regions":[],"tags":[]}'::jsonb,
    100,
    20,
    ceil(20 * 1.35 + 10)::int,
    'paused',
    'unbilled'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '[Pilot] Price Test',
    'Price test',
    'price_test',
    1,
    'À quel prix achèteriez-vous ce produit ?',
    '["4,99 €", "7,99 €", "9,99 €", "12,99 €"]'::jsonb,
    '{"ageMin":18,"ageMax":65,"regions":[],"tags":[]}'::jsonb,
    100,
    25,
    ceil(25 * 1.35 + 10)::int,
    'paused',
    'unbilled'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '[Pilot] Slogan Test',
    'Slogan',
    'slogan',
    1,
    'Quel slogan vous marque le plus ?',
    '["Slogan A", "Slogan B", "Slogan C"]'::jsonb,
    '{"ageMin":18,"ageMax":65,"regions":[],"tags":[]}'::jsonb,
    80,
    20,
    ceil(20 * 1.35 + 10)::int,
    'paused',
    'unbilled'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '[Pilot] Concept Test',
    'Concept',
    'concept',
    1,
    'Quel concept vous donne le plus envie ?',
    '["Concept A", "Concept B"]'::jsonb,
    '{"ageMin":18,"ageMax":65,"regions":[],"tags":[]}'::jsonb,
    80,
    20,
    ceil(20 * 1.35 + 10)::int,
    'paused',
    'unbilled'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '[Pilot] NPS rapide',
    'NPS',
    'nps',
    1,
    'Sur une échelle de 0 à 10, recommanderiez-vous ce produit à un proche ?',
    '[]'::jsonb,
    '{"ageMin":18,"ageMax":65,"regions":[],"tags":[]}'::jsonb,
    50,
    15,
    ceil(15 * 1.35 + 10)::int,
    'paused',
    'unbilled'
  )
) as v(org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, billing_status)
where not exists (
  select 1 from public.campaigns c
  where c.org_id = v.org_id and c.name = v.name
);
