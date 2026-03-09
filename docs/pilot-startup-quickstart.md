# Démarrage rapide pilot — PulsePanel

Pour lancer l’environnement et vérifier l’état avant démo / pilot.

---

## Prérequis

- Node.js LTS, npm (ou pnpm).
- Compte Supabase (projet configuré, migrations appliquées).
- Clés Stripe si topup en démo (dashboard + webhook).

## 1. Premier setup (une fois)

- Cloner / ouvrir le repo. À la racine :
  - `npm install` (ou `npm install` dans `dashboard` et `mobile`).
- Copier les env :
  - `dashboard` : copier `.env.example` vers `.env.local` (ou `.env`), remplir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ; Stripe si besoin.
  - `mobile` : copier `.env.example` vers `.env`, remplir `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Optionnel : `scripts/bootstrap.ps1` pour scaffold complet (voir script).

## 2. Lancer

À la **racine** du repo :

- **Dashboard** : `npm run dev:dashboard` (Next.js).
- **Mobile** : `npm run dev:mobile` (Expo) ; puis scanner le QR ou lancer simulateur.

Supabase : projet cloud déjà déployé ou `supabase start` en local (voir `docs/setup-supabase-cloud.md`).

## 3. Vérifier l’état (smoke)

À la racine, en PowerShell :

```powershell
.\scripts\pilot-smoke.ps1
```

**Smoke** : structure, env, routes clés, docs pilot, typecheck, build (WARN si échec). Corriger les [FAIL] avant démo. **Gate build stricte** : `.\scripts\prelaunch-dashboard-check.ps1` (typecheck + next build) ; checklist : `docs/prelaunch-technical-checklist.md`.

## 4. Docs utiles

- Scénarios critiques : `docs/pilot-critical-scenarios.md`
- Checklists : `docs/checklist-launch-campaign.md`, `checklist-review-withdrawal.md`, `checklist-support-incident.md`
- Démo 10 min : `docs/demo-script-10min.md`
- Preuves : `docs/pilot-evidence-matrix.md`
- Seed pilot (org + 5 campagnes démo) : `docs/pilot-seed-quickstart.md`, `docs/pilot-seed-dataset.md`
- Pack exécution pilot business (offre, ICP, pipeline, templates, checklists) : `docs/pilot-offer-one-pager.md`, `docs/lead-to-repeat-runbook.md`, `docs/checklist-onboard-pilot-company.md`, `docs/checklist-post-campaign-proof-repeat.md`
- Pack acquisition user pilot (plan supply, segmentation sources, templates recrutement, qualité, runbook fraude) : `docs/user-pilot-supply-plan.md`, `docs/user-recruitment-templates.md`, `docs/checklist-source-to-first-campaign.md`, `docs/user-acquisition-fraud-guardrails-runbook.md`

Runbooks détaillés : billing, retraits, flags, campagnes admin, daily limits, user devices, etc. dans `docs/`. Scripts : `scripts/pilot-business-pack.ps1` (prospects), `scripts/user-supply-pack.ps1` (sources user). **Pré-lancement** : `scripts/prelaunch-dashboard-check.ps1`, `docs/prelaunch-technical-checklist.md`, `docs/prelaunch-build-hardening-report.md`.
