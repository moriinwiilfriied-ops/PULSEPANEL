-- VoxSnap — Plan de tables (placeholder, à adapter en migrations Supabase)
-- Ne pas exécuter tel quel : utiliser supabase/migrations/ pour les vrais fichiers.

-- Profils / utilisateurs (complément auth.users si besoin)
-- users: id, email, display_name, avatar_url, created_at, etc.
-- CREATE TABLE public.users ( ... );

-- Organisations (tenant pour campagnes)
-- orgs: id, name, slug, created_at
-- CREATE TABLE public.orgs ( ... );

-- Campagnes (sondages / votes à swiper)
-- campaigns: id, org_id, title, status, start_at, end_at, created_at
-- CREATE TABLE public.campaigns ( ... );

-- Réponses des utilisateurs aux campagnes (swipe / vote)
-- responses: id, campaign_id, user_id, choice, created_at
-- CREATE TABLE public.responses ( ... );

-- Écritures du ledger (mouvements de points / récompenses)
-- ledger_entries: id, user_id, amount, type, reference_id, created_at
-- CREATE TABLE public.ledger_entries ( ... );

-- Soldes courants par utilisateur (cache ou vue)
-- balances: user_id, balance, updated_at
-- CREATE TABLE public.balances ( ... );

-- Feature flags / config (optionnel)
-- flags: key, value, updated_at
-- CREATE TABLE public.flags ( ... );
