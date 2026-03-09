# Mission DASHBOARD_ENTERPRISE_AUTH_MINIMUM_01 — Rapport

## 1. Vérifications initiales (ÉTAPE 0)

### Arborescence utile
- **dashboard** : app (page.tsx, layout.tsx, billing, campaigns, withdrawals, admin, api), src/lib (supabase.ts, adminAuth.ts, supabaseCampaigns.ts), src/components (SupabaseAuthInit, OrgCreditHeader), middleware.ts.
- **supabase** : migrations 0001–0020 (orgs, org_members, can_manage_org, RLS, billing, webhooks, etc.).
- **docs** : admin runbooks, schema, setup-supabase-cloud.

### Auth dashboard actuelle confirmée
- **supabase.ts** : `createClient(url, anonKey)` côté client uniquement. Pas de `@supabase/ssr` ni `createServerClient`.
- **ensureAnonSession()** : appelle `signInAnonymously()` si pas de session — mode principal actuel.
- **ensureOrg()** : si pas d’org, crée "PulsePanel (demo)" et associe l’utilisateur anonyme (trigger owner).
- **getOrgMembership()** : `supabase.auth.getUser()` puis `org_members` avec tri owner > editor > created_at desc ; retourne une seule org (la “première”).
- **getCurrentOrgId()** : dérive de getOrgMembership(), une seule org implicite.
- **SupabaseAuthInit** : client, `useEffect` → ensureAnonSession() puis ensureOrg().
- **create-checkout** : reçoit `Authorization: Bearer <token>`, crée un client Supabase avec ce token, vérifie `org_members` pour l’org demandée.

### Org scoping actuel confirmé
- **DB** : `org_members(org_id, user_id, role)`, `can_manage_org(_org_id)` (owner/editor), RLS sur orgs, campaigns, org_balances, etc.
- **Dashboard** : getCurrentOrgId / getOrgMembership utilisés dans billing, campaigns/new, campaigns/[id], withdrawals, OrgCreditHeader, supabaseCampaigns (getCampaigns, createCampaign, etc.).
- Pas de cookie “org courante” : l’org est dérivée uniquement de la première membership (déterministe).

### Pages / routes existantes
- `/` (app/page.tsx), `/campaigns/new`, `/campaigns/[id]`, `/billing`, `/billing/success`, `/billing/cancel`, `/withdrawals`.
- `/admin`, `/admin/login`, `/admin/*` (users, withdrawals, flags, campaigns, ledger, webhooks).
- `/api/stripe/create-checkout`, `/api/stripe/webhook`.

### Policies et modèle org
- **0002_orgs.sql** : `create table org_members`, policies org_members_select_member, insert_owner, delete_owner ; orgs_select_member, insert_authenticated, update/delete_owner ; campaigns RLS via org_members (owner/editor).
- **0004_wallet_server.sql** : `can_manage_org(_org_id)` → existe in org_members avec role in ('owner','editor').
- Migrations suivantes : RLS et RPC utilisent can_manage_org / org_members.

### Capacités auth Supabase
- **Présent** : Supabase Auth (getUser, getSession, signInAnonymously).
- **Absent** : pas de magic link / OTP côté dashboard ; pas de `@supabase/ssr` (pas de session serveur via cookies).
- **Disponible dans Supabase** : signInWithOtp (magic link / OTP), exchangeCodeForSession (callback). À activer dans le projet (Email provider).

### Limites confirmées
- Pas de vrai login entreprise ; accès anonyme + ensureOrg.
- Pas de résolution explicite multi-org (une seule org “première”).
- Pas d’écran “aucune org” ni “choisir une org”.
- Admin /admin séparé (passphrase + cookie pulsepanel_admin_session), middleware uniquement sur /admin.

---

## 2. Choix retenus

- **Login** : Magic link Supabase (`signInWithOtp`) depuis la page `/login`, callback sur `/auth/callback` avec `exchangeCodeForSession`. Pas de mot de passe, pas de SSO.
- **Session** : Cookies gérés par `@supabase/ssr` (middleware rafraîchit la session, `createServerClient` en serveur, `createBrowserClient` en client).
- **Résolution d’org** : `org_members` (owner/editor) ; org courante = cookie `pulsepanel_current_org` validé côté serveur (middleware + API set-current-org).
- **Multi-org** : Si plusieurs orgs et pas de cookie valide → redirect `/select-org` ; l’utilisateur choisit, POST `/api/dashboard/set-current-org` valide et pose le cookie.
- **Fallback dev** : `DASHBOARD_ALLOW_ANON_DEV=1` en dev uniquement permet session anonyme + ensureOrg ; désactivé par défaut, jamais en prod.

## 3. Fichiers créés

- `dashboard/app/login/page.tsx` — formulaire email, envoi magic link
- `dashboard/app/auth/callback/route.ts` — échange code → session, redirect
- `dashboard/app/no-access/page.tsx` — message « accès non configuré »
- `dashboard/app/select-org/page.tsx` — choix d’org si multi-membership
- `dashboard/app/select-org/SelectOrgForm.tsx` — formulaire de sélection (client)
- `dashboard/app/api/dashboard/set-current-org/route.ts` — POST orgId, validation + cookie
- `dashboard/src/lib/supabaseServer.ts` — createServerClient avec cookies
- `dashboard/src/lib/dashboardAuth.ts` — session, memberships, resolve org, guard, cookie org
- `docs/dashboard-enterprise-auth-runbook.md` — runbook provisioning pilot

## 4. Fichiers modifiés

- `dashboard/middleware.ts` — rafraîchissement session Supabase + guard dashboard (redirect /login, /no-access, /select-org), bypass dev si `DASHBOARD_ALLOW_ANON_DEV=1`
- `dashboard/src/lib/supabase.ts` — client en `createBrowserClient`, lecture cookie `pulsepanel_current_org`, `getOrgMembership` prend en compte le cookie, `ensureAnonSession`/`ensureOrg` uniquement si `DASHBOARD_ALLOW_ANON_DEV=1`
- `dashboard/package.json` — ajout dépendance `@supabase/ssr`

## 5. Migration éventuelle

Aucune migration DB : réutilisation de `org_members` et RLS existants. Supabase Auth (Email magic link) doit être activé côté projet (Dashboard → Auth → Providers).

## 6. Sources de vérité

- **Session** : Supabase Auth (cookies via @supabase/ssr).
- **Accès org** : table `org_members` (role owner/editor), vérifié en serveur (middleware, API set-current-org, RLS).
- **Org courante** : cookie `pulsepanel_current_org` (validé à chaque usage côté serveur).

## 7. Gates

- **Typecheck** : `npx tsc --noEmit` OK.
- **Lint** : pas d’erreurs sur les fichiers touchés.
- **Vérifications manuelles à faire** :
  - Non authentifié → redirect `/login`.
  - User avec 1 org → accès dashboard (org courante = cette org).
  - User avec plusieurs orgs → redirect `/select-org`, puis après choix accès dashboard.
  - User sans org → redirect `/no-access`.
  - `/admin` fonctionne indépendamment (passphrase).
  - create-checkout et campagnes/billing/withdrawals restent scopés à l’org (cookie + org_members).

## 8. Diff résumé

- Auth anonyme n’est plus le mode principal ; login réel par magic link.
- Guard dans le middleware : redirect selon session + memberships + cookie org.
- Helpers serveur dédiés (dashboardAuth, supabaseServer) sans mélange avec adminAuth.
- Client Supabase en createBrowserClient pour synchroniser la session avec les cookies.

## 9. Ce qui restera pour la mission suivante

- Écran ou flux d’invitation (lier user ↔ org sans SQL manuel) si souhaité.
- Lien « Changer d’organisation » dans le header pour les utilisateurs multi-org (optionnel).
- Vérification manuelle de bout en bout (magic link, select-org, create-checkout, admin) en environnement de test.
