-- PulsePanel — Reset seed pilot (staging / dev uniquement)
-- Supprime l'org pilot et toutes les données associées. NE PAS exécuter en production.
-- Id org pilot : a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 (identique à pilot_seed.sql)

-- Ordre respect des FK : ledger, campagnes, balances, members, org
delete from public.org_ledger_entries where org_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
delete from public.campaigns where org_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
delete from public.org_balances where org_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
delete from public.org_members where org_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
delete from public.orgs where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
