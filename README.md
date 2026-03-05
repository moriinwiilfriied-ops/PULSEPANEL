# VoxSnap — Monorepo

Application mobile (feed swipe) + dashboard de campagnes, backend Supabase.

## Prérequis

- **Node.js** LTS (v20 ou v22 recommandé) — [nodejs.org](https://nodejs.org)
- **Git** — [git-scm.com](https://git-scm.com)
- **Supabase CLI** (optionnel pour dev local) — `npm i -g supabase`
- **Expo Go** sur smartphone (pour tester l’app mobile sans build natif)

## Installation rapide

Une seule commande pour tout initialiser :

```powershell
.\scripts\bootstrap.ps1
```

Puis suivre les instructions affichées à la fin du script.

## Structure du monorepo

| Dossier      | Stack                    | Rôle                          |
|-------------|--------------------------|-------------------------------|
| `mobile/`   | Expo (React Native) + Expo Router + TypeScript | App mobile (feed swipe)       |
| `dashboard/`| Next.js + TypeScript + Tailwind | Back-office campagnes         |
| `supabase/` | Supabase CLI             | Migrations, Edge Functions    |
| `scripts/`  | PowerShell                | Bootstrap et utilitaires      |
| `docs/`     | —                        | Schéma SQL, doc               |

## Lancer le projet

À la racine du repo (après `bootstrap.ps1`) :

```powershell
# App mobile (Expo)
npm run dev:mobile

# Dashboard Next.js
npm run dev:dashboard
```

- **Mobile** : ouvrir Expo Go et scanner le QR code (ou lancer un émulateur).
- **Dashboard** : ouvrir [http://localhost:3000](http://localhost:3000).

## Supabase

### Local

1. Installer Docker (pour Supabase local).
2. À la racine : `npx supabase start` (après `supabase init` fait par le bootstrap).
3. Les variables d’environnement sont dans `.env` (voir `.env.example`).

### Production

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Copier les clés dans `.env` / `mobile/.env` / `dashboard/.env` (voir chaque `.env.example`).
3. Pousser les migrations : `npx supabase db push` (quand prêt).

## Scripts racine

| Script           | Action                    |
|------------------|---------------------------|
| `npm run dev:mobile`   | Démarre Expo (mobile)     |
| `npm run dev:dashboard`| Démarre Next.js (dashboard) |
| `npm run lint`        | Lint (placeholder)        |
| `npm run typecheck`   | Vérification TypeScript (placeholder) |

## Fichiers d’environnement

- Racine : `.env` (optionnel, Supabase local).
- `mobile/.env` : clés Expo / Supabase pour l’app mobile (`.env.example` créé par le bootstrap).
- `dashboard/.env.local` : clés Next.js / Supabase pour le dashboard (`.env.example` créé par le bootstrap).

Copier les `.env.example` en `.env` (ou `.env.local` pour le dashboard) et remplir les valeurs.
