# Mission PILOT_SEED_AND_DEMO_DATASET_01 — Rapport final

## 1. Vérifications initiales

- **Seed / mock / demo existants** : Mock data dans dashboard et mobile (fallback quand Supabase vide/erreur). ensureOrg() crée « PulsePanel (demo) » en dev uniquement. Aucun seed SQL pilot, aucun dossier supabase/seed avant cette mission.
- **Tables / champs** : Confirmés — orgs (id, name, created_by), org_members (org_id, user_id, role), campaigns (org_id, name, template, template_key, question, options, targeting, quota, reward_cents, price_cents, status, billing_status, cost_*), org_balances (trigger à l’insert org), org_ledger_entries. Pas de statut « draft » ; status = paused n’entraîne pas de billing.
- **Stratégie seed retenue** : SQL idempotent (org id fixe + insert campagnes où not exists) + script PowerShell avec garde-fou, exécution manuelle uniquement.
- **Garde-fou anti-prod retenu** : Variable `PILOT_SEED_ENABLED=1` obligatoire ; refus si `APP_ENV=production` ; confirmation explicite « YES » dans le script ; pas de seed automatique au boot.

## 2. Choix retenus

- **Technique** : Fichier SQL `supabase/seed/pilot_seed.sql` (org + 5 campagnes en paused) ; script `scripts/pilot-seed.ps1` qui vérifie l’env, demande confirmation, puis exécute le SQL via Supabase CLI ou indique d’exécuter le fichier à la main. Reset : `supabase/seed/pilot_reset.sql` + `scripts/pilot-reset.ps1`.
- **Dataset** : Une org « PulsePanel Pilot » (id fixe `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`). Cinq campagnes avec préfixe `[Pilot]` (A/B Packaging, Price Test, Slogan Test, Concept Test, NPS rapide), types et pricing alignés sur les templates existants.
- **Users test** : Aucun user Auth créé par le seed (pas d’API Auth depuis le repo). Documentation pour rattacher manuellement son compte à l’org pilot (insert org_members). Users mobiles : création manuelle (Supabase Auth).
- **Alignement démo / scénarios** : pilot-critical-scenarios.md et demo-script-10min.md mis à jour pour référencer le seed ; pilot-evidence-matrix et pilot-startup-quickstart pointent vers le quickstart seed et le dataset.

## 3. Fichiers créés

- `docs/pilot-seed-dataset.md` — source de vérité du dataset (org, 5 campagnes, users, ce qui est seed vs manuel).
- `docs/pilot-kpi-minimum-spec.md` — KPI minimums pilot (entreprise, user, ops) ; état actuel (calculable / à instrumenter).
- `supabase/seed/pilot_seed.sql` — insert org + 5 campagnes (paused), idempotent.
- `supabase/seed/pilot_reset.sql` — suppression org pilot et données liées.
- `scripts/pilot-seed.ps1` — garde-fou + confirmation + exécution seed.
- `scripts/pilot-reset.ps1` — garde-fou + confirmation + exécution reset.
- `docs/pilot-seed-quickstart.md` — prérequis, lancer seed, vérifier, associer compte, démo, reset, manuel vs auto.
- `docs/pilot-seed-mission-report.md` — ce rapport.

## 4. Fichiers modifiés

- `docs/pilot-critical-scenarios.md` — paragraphe « Dataset démo » + lien pilot-seed-quickstart et usage des campagnes [Pilot].
- `docs/demo-script-10min.md` — optionnel avant démo : lancer seed, associer compte, topup, activer une campagne.
- `docs/pilot-evidence-matrix.md` — lien vers pilot-seed-dataset et pilot-seed-quickstart.
- `docs/pilot-startup-quickstart.md` — ajout des liens seed (pilot-seed-quickstart, pilot-seed-dataset).
- `scripts/pilot-smoke.ps1` — ajout des docs pilot-seed-quickstart.md et pilot-seed-dataset.md dans la liste des docs critiques.

## 5. Gates

- Aucun code applicatif modifié (dashboard / mobile / API) : pas de typecheck/lint supplémentaire.
- Seed : exécutable manuellement avec PILOT_SEED_ENABLED=1 et confirmation ; SQL vérifié (syntaxe, ordre FK). Exécution réelle dépend de l’env (Supabase CLI ou SQL Editor).
- Org pilot et 5 campagnes : définis dans pilot_seed.sql ; après exécution, visibles en base (orgs, campaigns).
- Quickstart : documenté dans pilot-seed-quickstart.md (prérequis, commandes, vérification, association compte, reset).
- Docs pilot : scénarios, démo, preuves, startup-quickstart alignés avec le seed (références croisées).
- Garde-fou anti-prod : PILOT_SEED_ENABLED=1 obligatoire, refus si APP_ENV=production, confirmation « YES » dans pilot-seed.ps1 et pilot-reset.ps1.

## 6. Diff résumé

- Ajout d’un dataset pilot reproductible (1 org, 5 campagnes [Pilot] en paused), seed et reset explicites, documentés et protégés contre la prod.
- Aucun flux métier modifié ; aucun seed automatique ; aucun user Auth créé par le seed.
- KPI minimums figés dans une spec (calculables vs à instrumenter) sans implémentation analytics.

## 7. Ce qui restera pour la mission suivante

- **Users test** : création manuelle des comptes Auth (entreprise + mobile) ; optionnel : script ou doc dédiée pour créer 1–2 users test via Supabase Admin API si besoin.
- **Analytics / dashboard KPI** : `docs/pilot-kpi-minimum-spec.md` sert de référence ; implémentation (dashboard, agrégations) hors périmètre de cette mission.
- **Indicateur campagnes seed** : convention de nommage `[Pilot]` déjà en place ; filtre ou badge admin « seed » possible en mission ultérieure si utile.
