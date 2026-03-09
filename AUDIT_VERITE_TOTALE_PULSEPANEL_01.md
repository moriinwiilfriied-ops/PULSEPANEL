# AUDIT VÉRITÉ TOTALE — PulsePanel (Mission 01)

**Date** : 2025-03-09  
**Mode** : Lecture seule, aucun fichier modifié.  
**Objectif** : État réel du repo, vérification des affirmations produit/tech/ops/pilot, readiness pilote.

---

## 1. Résumé exécutif

- **Produit** : PulsePanel est un monorepo (mobile Expo + dashboard Next.js) pour campagnes de type “sondage/réponse” avec récompense utilisateur (pending/available), retraits manuels, billing org (Stripe), admin ops (flags, retraits, ledger, webhooks). Le README racine parle encore de “VoxSnap” alors que les migrations et la majorité des docs/code parlent de “PulsePanel”.
- **Techniquement** : Backend Supabase (RLS, RPC, triggers), 26 migrations, ledger user/org, trust/daily limits, user_devices, webhook_events, traçabilité retraits. Mobile : auth anonyme, feed → answer, wallet, retrait, profil (trust DB), enregistrement device. Dashboard : auth OTP (magic link), multi-org, campagnes, billing, withdrawals entreprise, détail campagne (qualité, proof pack, V2). Admin : passphrase, overview, users, withdrawals, flags, ledger, webhooks, campaigns cross-org.
- **Points bloquants identifiés** : (1) La logique de guard dashboard et admin est dans `dashboard/proxy.ts` mais **aucun fichier `middleware.ts`** ne l’invoque — les redirections login/select-org/no-access et la protection /admin ne sont **pas appliquées** en production Next.js. (2) Build dashboard non exécuté lors de l’audit (non vérifié automatiquement).
- **Verdict pilote** : **Prêt pour un premier pilote contrôlé sous conditions** : corriger le wiring du middleware (ou équivalent), exécuter prelaunch + smoke, valider manuellement les scénarios critiques et l’env Stripe/Supabase. Plusieurs affirmations “pack pilot / dry run / go-no-go” sont **documentées** et partiellement **scriptées** ; la **gate technique réelle** (middleware) est absente tant que `proxy` n’est pas utilisé.

---

## 2. Ce que PulsePanel est réellement aujourd’hui

### 2.1 Positionnement réel

- **Côté entreprise** : Dashboard (Next.js) pour créer/gérer des campagnes (question, options, quota, reward), activer/pause/terminer, voir KPI (réponses, qualité, temps au quota, repeat), recharger le crédit org (Stripe), consulter withdrawals, détail campagne avec proof pack et duplication V2. Auth : magic link (OTP), multi-org (select-org, no-access).
- **Côté user** : App mobile (Expo) : onboarding, feed de campagnes actives, réponse (choix/texte), wallet (pending/available, historique, demande de retrait), profil (trust_level/trust_score depuis DB, limites du jour). Auth : anonyme (Supabase).
- **Use cases visibles** : Tests A/B (packaging, prix, slogan, concept, NPS), récompense par réponse, retrait manuel tracé, modération (flags), gel retrait user, limites journalières par niveau de confiance.
- **Cohérence nom** : **Incohérence** — `package.json` racine : `"name": "voxsnap-monorepo"` ; README : “VoxSnap — Monorepo”. Migrations, docs, admin, dashboard : “PulsePanel”. Code et docs produit = PulsePanel.

### 2.2 Deux faces du produit

- **Mobile répondant** : Présent — `mobile/` (Expo 54, expo-router), écrans (tabs) feed, wallet, profile, onboarding, answer. Données réelles quand Supabase configuré (sinon mock).
- **Dashboard entreprise** : Présent — `dashboard/` (Next 16), pages /, /login, /select-org, /no-access, /campaigns/new, /campaigns/[id], /billing, /withdrawals. Auth réelle (magic link) ; guard **non appliqué** (middleware non branché).
- **Console admin / ops** : Présente — `/admin` (overview, users, withdrawals, flags, campaigns, ledger, webhooks), login passphrase. Protection **côté API** (getAdminSession) ; **pages admin** rendues côté serveur avec `supabaseAdmin` sans redirect si pas de cookie (layout n’affiche que la nav quand session, mais le contenu des pages est quand même rendu). La **redirection /admin → /admin/login** est implémentée dans `proxy.ts` mais **pas exécutée** (pas de middleware.ts).

### 2.3 Monétisation en place

- **Topup Stripe** : Implémenté — `dashboard/app/api/stripe/create-checkout/route.ts` (Bearer token, vérification org_members owner/editor), `dashboard/app/api/stripe/webhook/route.ts` (signature Stripe, upsert webhook_events, insert org_topups, 23505 → 200 sans re-crédit, org_credit_topup). Preuve : `supabase/migrations/0015_stripe_topups.sql`, `0019_webhook_events.sql`.
- **Crédit org** : org_balances, org_ledger_entries, org_credit_topup, bill_campaign_on_activate (insufficient_org_credit). Preuve : `0011_org_credits.sql`, `0016_billing_ledger_rpc.sql`, `0017_billing_ledger_enrich.sql`.
- **Wallet user** : user_balances (pending_cents, available_cents), ledger_entries, trigger sur insert users, crédit pending sur réponse (trigger), validation campagnes → available. Preuve : `0001_init.sql`, `0004_wallet_server.sql`, etc.
- **Pending / available** : Affichés et gérés côté mobile (wallet) et côté DB (user_balances, ledger).
- **Retraits** : request_withdrawal (RPC), gel (user_risk_controls), limites journalières (trust_daily_limits), admin_decide_withdrawal (rejection_reason, external_reference, payment_channel, admin_note). Preuve : `0007_withdrawals.sql`, `0018_withdrawal_traceability.sql`, `0020_user_risk_controls_and_flag_review.sql`, `0022_trust_daily_limits_and_guards.sql`.

**Verdict** : Le produit permet aujourd’hui de lancer des campagnes, faire répondre des users, gérer pending/available, recharger l’org (Stripe), demander et traiter des retraits (admin), geler un user, appliquer des limites journalières. Il ne permet pas (sans correctif) de **forcer** la redirection login/select-org/admin car le middleware n’est pas actif.

---

## 3. Cartographie technique du système

### 3.1 Mobile

- **Stack** : Expo 54, React 19, expo-router, TypeScript, @supabase/supabase-js, zustand, expo-secure-store.  
  Preuve : `mobile/package.json`.
- **Routing** : `app/_layout.tsx`, `(tabs)/_layout.tsx`, `onboarding`, `answer`, `modal`, `+not-found`.  
  Preuve : structure `mobile/app/`.
- **Écrans principaux** : onboarding, feed, wallet, profile, answer (modal).  
  Preuve : `mobile/app/(tabs)/feed.tsx`, `wallet.tsx`, `profile.tsx`, `answer.tsx`, `onboarding.tsx`.
- **Services / API** : `mobile/lib/supabaseApi.ts` (fetchUserTrust, fetchActiveCampaigns, fetchCampaignById, submitResponseToSupabase, fetchWalletFromSupabase, requestWithdrawal, fetchUserDailyLimitStatus, fetchMyWithdrawals, etc.), `supabase.ts`, `deviceRegistration.ts` (ensureDeviceRegistered, register_user_device RPC).  
  Preuve : fichiers cités.
- **Auth** : Auth anonyme Supabase + `ensureAnonSession` dans `_layout.tsx` ; onboarding complété → replace feed.  
  Preuve : `mobile/lib/supabase.ts`, `mobile/app/_layout.tsx`.
- **Wallet** : user_balances (pending/available), historique via responses + campaigns, requestWithdrawal RPC, messages d’erreur (withdrawals_frozen, daily_withdrawal_request_limit_reached, etc.).  
  Preuve : `supabaseApi.ts`, `(tabs)/wallet.tsx`.
- **Answer flow** : getFeedQuestionsWithSource → answer → submitResponseToSupabase ; erreurs de limite (responseLimitErrorToMessage).  
  Preuve : `feed.tsx`, `answer.tsx`, `supabaseApi.ts`.
- **Profile / trust** : fetchUserTrust (users.trust_level, trust_score), fetchUserDailyLimitStatus ; affichage dans profile.  
  Preuve : `profile.tsx`, `supabaseApi.ts`.
- **user_devices** : ensureDeviceRegistered appelé après auth dans `_layout.tsx` ; getOrCreateInstallId (SecureStore), RPC register_user_device (hash SHA256).  
  Preuve : `deviceRegistration.ts`, `_layout.tsx`, migration `0021_user_devices.sql`.

### 3.2 Dashboard

- **Stack** : Next 16, React 19, Tailwind 4, @supabase/ssr, @supabase/supabase-js, Stripe.  
  Preuve : `dashboard/package.json`.
- **Routing** : App Router — `/`, `/login`, `/select-org`, `/no-access`, `/campaigns/new`, `/campaigns/[id]`, `/billing`, `/withdrawals`, `/auth/callback`, `/admin/*`.  
  Preuve : `dashboard/app/`.
- **Auth entreprise** : Magic link (signInWithOtp), callback `/auth/callback`. Résolution org : org_members (owner/editor), cookie pulsepanel_current_org, guard (login / no-access / select-org) **défini dans `proxy.ts`** mais **non utilisé** (pas de middleware.ts).  
  Preuve : `login/LoginForm.tsx`, `auth/callback/route.ts`, `dashboardAuth.ts`, `proxy.ts`.
- **Create campaign / detail / billing / withdrawals** : Pages et libs présentes (supabaseCampaigns, pilotKpis, campaignProof, campaignQualityInsights, duplicateCampaign, validateCampaignPayouts, exportCampaignResponses).  
  Preuve : `campaigns/new/page.tsx`, `campaigns/[id]/page.tsx`, `billing/page.tsx`, `withdrawals/page.tsx`.
- **Admin** : Layout avec nav Overview, Users, Withdrawals, Flags, Campaigns, Ledger, Webhooks ; login passphrase (adminAuth), API routes protégées par getAdminSession.  
  Preuve : `admin/layout.tsx`, `admin/login/page.tsx`, `api/admin/*`.

### 3.3 Backend / data layer

- **Supabase** : 26 migrations (0000–0025). Tables : users, campaigns, responses, user_balances, ledger_entries, flags, orgs, org_members, org_balances, org_ledger_entries, org_topups, withdrawals, user_risk_controls, trust_daily_limits, user_devices, webhook_events, campaign_quality_stats, etc.  
  Preuve : `supabase/migrations/`.
- **RLS** : users, user_balances, campaigns, responses (policies selon auth.uid() ou org_members). ledger_entries, flags, user_risk_controls, user_devices, webhook_events : pas de policy (service_role).  
  Preuve : migrations 0001, 0002, 0020, 0021, 0019.
- **RPC** : request_withdrawal, admin_decide_withdrawal, get_user_daily_limit_status, get_admin_user_daily_limit_status, register_user_device, org_credit_topup, get_campaign_time_to_quota, get_org_repeat_baseline, get_org_pilot_kpis, get_admin_pilot_kpis, get_campaign_quality_deep, campaign_org, can_manage_org, etc.  
  Preuve : migrations 0020, 0022, 0021, 0018, 0016, 0023, 0025.
- **Triggers** : fn_create_user_balance, check_daily_limits_before_response, bill_campaign_on_activate, ensure_org_balance, etc.  
  Preuve : 0001, 0022, 0011.

### 3.4 Stripe

- **create-checkout** : POST avec Bearer token, vérification org_members (owner/editor), metadata org_id + amount_cents, success_url / cancel_url.  
  Preuve : `dashboard/app/api/stripe/create-checkout/route.ts`.
- **Webhook** : Vérification signature (stripe.webhooks.constructEvent), upsert webhook_events (provider, event_id), traitement checkout.session.completed, insert org_topups (unique stripe_checkout_session_id), 23505 → 200 sans crédit, org_credit_topup.  
  Preuve : `dashboard/app/api/stripe/webhook/route.ts`.
- **Idempotence** : Contrainte unique sur org_topups.stripe_checkout_session_id ; doublon → 200 + update webhook_events processed.  
  Preuve : `0015_stripe_topups.sql`, webhook route (l.119–121).

### 3.5 Schéma textuel

```
Mobile (Expo) ──► Supabase (anon key) : auth anonyme, campaigns, responses, user_balances, withdrawals, RPC (request_withdrawal, get_user_daily_limit_status, register_user_device)
Dashboard (Next) ──► Supabase (cookies SSR) : auth magic link, org_members, campaigns, billing, withdrawals entreprise
Dashboard ──► Stripe : create-checkout (server), pas d’appel direct depuis le client
Admin ──► supabaseAdmin (service_role) : users, withdrawals, flags, ledger, webhooks, campaigns cross-org, user_risk_controls, user_devices
Webhook Stripe ──► dashboard/api/stripe/webhook ──► webhook_events + org_topups + org_credit_topup
```

**Point critique** : La protection des routes (redirect /login, /select-org, /no-access, /admin → /admin/login) est dans `dashboard/proxy.ts` ; Next.js n’exécute que un fichier `middleware.ts` (ou `src/middleware.ts`) avec un export default. Aucun fichier middleware.ts n’existe et aucun import de `proxy` n’est trouvé. Donc **les guards ne sont pas appliqués**.

---

## 4. Vérification des 30 affirmations majeures

| # | Affirmation | Verdict | Preuves / commentaire |
|---|-------------|---------|------------------------|
| 1 | Il existe une vraie console admin minimale protégée | **PARTIAL** | Console présente (overview, users, withdrawals, flags, ledger, webhooks, campaigns). Protection : API routes (getAdminSession) OK ; **pages admin** rendues côté serveur sans redirect si pas de cookie. Logique redirect dans `proxy.ts` non exécutée (pas de middleware). |
| 2 | /admin contient overview, users, withdrawals, flags, ledger, webhooks | **VERIFIED** | `admin/layout.tsx` NAV ; `admin/page.tsx`, `admin/users/page.tsx`, `admin/withdrawals/page.tsx`, `admin/flags/page.tsx`, `admin/ledger/page.tsx`, `admin/webhooks/page.tsx`, `admin/campaigns/page.tsx`. |
| 3 | Le process retrait manuel est traçable | **VERIFIED** | withdrawals.rejection_reason, external_reference, payment_channel, admin_note ; admin_decide_withdrawal ; WithdrawalDetailActions, checklist-review-withdrawal. Migrations 0018, 0019 ; admin/withdrawals/[id]. |
| 4 | Le trust mobile lit réellement users.trust_level / trust_score depuis la DB | **VERIFIED** | `mobile/lib/supabaseApi.ts` fetchUserTrust ; `mobile/app/(tabs)/profile.tsx` affiche trust_label, trust_score. |
| 5 | webhook_events existe et /admin/webhooks lit de vraies données | **VERIFIED** | Table webhook_events (0019) ; admin/webhooks/page.tsx utilise getAdminWebhookEvents (adminData.ts). |
| 6 | Les flags peuvent être revus avec note admin | **VERIFIED** | flags.admin_note, reviewed_at, reviewed_by ; API POST /api/admin/flags/[id]/review (legit, watch, actioned, freeze) ; FlagDetailActions. |
| 7 | Les retraits peuvent être gelés côté user via une vraie logique métier | **VERIFIED** | user_risk_controls.withdrawals_frozen ; API freeze user ; request_withdrawal lit v_frozen. 0020, admin users freeze. |
| 8 | request_withdrawal refuse réellement un retrait si cashout gelé | **VERIFIED** | request_withdrawal (0020, 0022) : select coalesce(urc.withdrawals_frozen, false) into v_frozen ; if v_frozen then return jsonb_build_object('error', 'withdrawals_frozen'). |
| 9 | Il existe une vue admin campaigns cross-org | **VERIFIED** | getAdminCampaigns (adminData.ts) sans filtre org obligatoire ; admin/campaigns/page.tsx, filters org_id, status, search. |
| 10 | Le dashboard entreprise a une auth minimale réelle (pas juste anon) | **PARTIAL** | Magic link (OTP) implémenté (LoginForm, auth/callback). En prod (sans DASHBOARD_ALLOW_ANON_DEV) la **redirection vers /login** est prévue dans proxy.ts mais **non appliquée** (middleware absent). |
| 11 | Le multi-org est géré | **VERIFIED** | org_members, resolveDashboardCurrentOrg, select-org, no-access, cookie pulsepanel_current_org ; create-checkout vérifie org_id + org_members. |
| 12 | user_devices existe réellement | **VERIFIED** | Table user_devices (0021), register_user_device RPC. |
| 13 | Le mobile enregistre une identité d’installation stable | **VERIFIED** | getOrCreateInstallId (SecureStore), ensureDeviceRegistered dans _layout après auth, RPC register_user_device (hash). deviceRegistration.ts, _layout.tsx. |
| 14 | Il existe des limites journalières trust-based côté serveur | **VERIFIED** | trust_daily_limits (Bronze/Argent/Or), get_user_daily_limit_status, check_daily_limits_before_response, request_withdrawal vérifie max_withdrawal_requests_per_day. 0022. |
| 15 | Elles s’appliquent réellement sur les réponses | **VERIFIED** | Trigger trg_check_daily_limits_before_response (0022), raise exception daily_response_count_limit_reached / daily_reward_limit_reached. |
| 16 | Elles s’appliquent réellement sur les demandes de retrait | **VERIFIED** | request_withdrawal (0022) : v_withdrawals_today >= v_max_withdrawals → error 'daily_withdrawal_request_limit_reached'. |
| 17 | Le wallet mobile gère proprement les erreurs de limite | **VERIFIED** | withdrawErrorFromApi (withdrawals_frozen, daily_withdrawal_request_limit_reached) ; responseLimitErrorToMessage (answer). supabaseApi.ts, wallet.tsx, answer.tsx. |
| 18 | campaign_activation / campaign_prepaid sont cohérents à l’affichage | **VERIFIED** | bill_campaign_on_activate, billing_status, cost_total_cents ; détail campagne et billing affichent statut et coûts. (Audit non exhaustif des libellés partout.) |
| 19 | Il existe un pack pilot (scénarios, smoke, checklists, démo) | **VERIFIED** | docs : pilot-critical-scenarios, pilot-smoke.ps1, prelaunch-technical-checklist, launch-day-checklist, demo-script-10min ; pilot-seed, pilot-reset, pilot-go-no-go.ps1. |
| 20 | Il existe un seed pilot propre | **VERIFIED** | supabase/seed/pilot_seed.sql (org + 5 campagnes [Pilot] paused), pilot_seed.ps1 (PILOT_SEED_ENABLED, confirmation YES), pilot_reset.sql, pilot-reset.ps1. |
| 21 | Il existe un repeat baseline réel | **VERIFIED** | get_org_repeat_baseline, get_org_pilot_kpis (repeat), get_admin_pilot_kpis (orgs_repeat_eligible, orgs_repeat_positive, repeat_rate). 0023, pilotKpis, repeat-enterprise-definition.md. |
| 22 | Il existe une duplication de campagne / V2 | **VERIFIED** | duplicateCampaign (supabaseCampaigns), source_campaign_id (0024), bouton “Créer une V2” sur détail campagne. |
| 23 | Il existe un proof pack / résumé preuve / case study template | **VERIFIED** | campaignProof.ts (buildCampaignProofPack, proofPackToMarkdown), case-study-template.md, détail campagne “Copier résumé”. |
| 24 | Il existe une vue qualité campagne enrichie | **VERIFIED** | get_campaign_quality_deep (0025), campaignQualityInsights.ts (buildCampaignQualityInsights), campaign_quality_stats, détail campagne. |
| 25 | Le build dashboard est vert | **NON VÉRIFIABLE** | Build non exécuté pendant l’audit. Docs (pilot-dry-run-report, prelaunch) indiquent PASS sous conditions. prelaunch-dashboard-check.ps1 fait typecheck + next build. |
| 26 | Il existe une gate prelaunch | **VERIFIED** | scripts/prelaunch-dashboard-check.ps1 (typecheck + next build). Documenté dans prelaunch-technical-checklist, pilot-go-no-go-matrix. |
| 27 | Il existe un dry run GO / NO-GO documenté | **VERIFIED** | docs/pilot-dry-run-report.md, docs/pilot-go-no-go-matrix.md, pilot-go-no-go.ps1 (prelaunch + smoke). |
| 28 | Il existe un pack business pilot | **VERIFIED** | pilot-business-pack.ps1 (dossier pilot-business, prospects.csv depuis template), docs (pilot-offer-one-pager, checklist-onboard-pilot-company, lead-to-repeat-runbook, etc.). |
| 29 | Il existe un pack acquisition user pilot | **VERIFIED** | user-supply-pack.ps1, docs (user-pilot-supply-plan, user-recruitment-templates, user-sources-template.csv, checklist-source-to-first-campaign, etc.). |
| 30 | Le projet est réellement pilotable avec 1 premier pilote contrôlé | **PARTIAL** | Fonctionnellement oui (flows présents). **Bloquant** : guard des routes (login, admin) non actif (proxy non branché). Sous réserve de corriger le middleware et de valider build + scénarios manuels + env Stripe/Supabase. |

---

## 5. Audit mobile complet

### 5.1 Écrans réellement présents

- Onboarding (`onboarding.tsx`), Feed (`(tabs)/feed.tsx`), Wallet (`(tabs)/wallet.tsx`), Profile (`(tabs)/profile.tsx`), Answer (`answer.tsx` modal), +not-found, modal.  
  Preuve : `mobile/app/`.

### 5.2 Flux câblés

- **Onboarding** : Formulaire → upsertUserOnboarding (users), completeOnboarding (store), replace feed.  
  Preuve : onboarding.tsx, supabaseApi.upsertUserOnboarding, _layout (store.completeOnboarding, router.replace).
- **Auth** : ensureAnonSession dans _layout ; après user, ensureDeviceRegistered.  
  Preuve : _layout.tsx, deviceRegistration.
- **Feed** : getFeedQuestionsWithSource (Supabase ou mock), filtre campagnes déjà répondues, navigation vers answer?questionId=.  
  Preuve : feed.tsx, supabaseApi.
- **Answer** : submitResponseToSupabase ou mock ; erreurs limite (responseLimitErrorToMessage) ; step reward puis back.  
  Preuve : answer.tsx, supabaseApi.
- **Wallet** : fetchWalletFromSupabase, requestWithdrawal, fetchMyWithdrawals ; affichage pending/available, historique, liste retraits, messages d’erreur (gel, limite, min 5€).  
  Preuve : wallet.tsx, supabaseApi.
- **Profil** : fetchUserTrust, fetchUserDailyLimitStatus ; affichage trust_level, trust_score, limites du jour.  
  Preuve : profile.tsx, supabaseApi.

### 5.3 Données réellement lues

- users (trust_level, trust_score, onboarding), user_balances, responses (+ campaigns pour historique), campaigns (actives, quota), withdrawals (liste user), RPC get_user_daily_limit_status, request_withdrawal, register_user_device.  
  Preuve : supabaseApi.ts, migrations.

### 5.4 Points fragiles

- Dépendance à EXPO_PUBLIC_SUPABASE_URL pour basculer du mock au réel ; pas de tests E2E.
- Gestion erreurs : principalement messages utilisateur et logs __DEV__.

### 5.5 Points encore partiels

- Stats “totalResponses” / “totalEarnings” en profil basées sur le store local (history) en plus du serveur ; cohérence à surveiller si usage mixte.

### 5.6 Warnings techniques

- Aucun test automatisé mobile repéré.

### 5.7 Prêt pour un petit pilote réel ?

**Oui**, sous réserve que le backend et les limites/gel soient validés (déjà vérifiés en audit). Le mobile lit et envoie les bonnes données (trust, limites, wallet, retrait, device). Pas de correctif code nécessaire pour le pilote côté mobile pour les fonctionnalités listées.

---

## 6. Audit dashboard complet

### 6.1 Parcours entreprise réel

- Accès à l’URL → **sans middleware actif** : pas de redirect forcé vers /login ; l’utilisateur peut voir / avec des données vides si non connecté (RLS).
- Login (magic link) → callback → **redirection attendue** vers / ou /select-org (implémentée dans proxy non branché).
- Select-org, no-access : pages présentes ; redirection depuis proxy si multi-org ou 0 org.
- Home : campagnes, KPI org (getOrgPilotKpis), crédit, repeat.  
  Preuve : page.tsx, pilotKpis.
- Create campaign : /campaigns/new.  
  Preuve : campaigns/new/page.tsx.
- Détail campagne : stats, qualité, temps au quota, proof pack, duplication V2, validation paiements, export CSV/JSON.  
  Preuve : campaigns/[id]/page.tsx, campaignProof, campaignQualityInsights, supabaseCampaigns.
- Billing : solde org, ledger, create-checkout (Bearer), success/cancel.  
  Preuve : billing/page.tsx, api/stripe/create-checkout.
- Withdrawals : liste retraits entreprise (côté org).  
  Preuve : withdrawals/page.tsx.

### 6.2 Clarté produit et cohérence billing / KPI

- Header crédit (OrgCreditHeader), libellés ledger (ledgerReasonLabels), KPI (pilotKpis, repeat) : cohérents avec le schéma et les RPC.

### 6.3 Points fragiles

- **Critique** : `proxy.ts` non utilisé → pas de guard. En production, sans autre mécanisme, un utilisateur non connecté peut accéder à des pages et voir des états vides ou des erreurs RLS au lieu d’être redirigé vers /login.
- Build non exécuté (non vérifié).

### 6.4 Points partiels

- Aucun middleware.ts ; dépendance à la doc (“le middleware redirige”) alors que le code de redirection n’est pas appliqué.

### 6.5 Readiness démo 10 min et pilote

- **Démo** : Possible si on considère que l’utilisateur se rend manuellement sur /login et que l’env (Supabase, Stripe) est correct.
- **Pilote** : **Conditionné** au correctif du guard (middleware ou équivalent) pour que login et select-org/no-access soient forcés.

---

## 7. Audit admin / ops complet

### 7.1 Ce qu’un opérateur peut faire

- Se connecter avec passphrase (si ADMIN_DASHBOARD_PASSPHRASE défini) ; **sans middleware**, l’URL /admin peut afficher le contenu sans cookie (données via supabaseAdmin). Les **actions** (freeze, review flag, decide withdrawal) passent par des API qui vérifient getAdminSession() → **protégées**.
- Overview : stats (withdrawals pending, flags open, campagnes actives, réponses 24h, topups 7j), webhook_events dispo, KPI pilot (get_admin_pilot_kpis).
- Users : liste, détail (trust, balances, devices, shared device, daily limit, risk_control), freeze/unfreeze.
- Withdrawals : liste, filtres, détail, decide (paid/rejected) avec traçabilité.
- Flags : liste, détail, review (legit, watch, actioned, freeze) avec admin_note.
- Ledger : ledger_entries (user), org_ledger_entries.
- Webhooks : liste webhook_events, stats, détail par event.
- Campaigns : liste cross-org, détail, actions statut (pause, reprendre, terminer).

### 7.2 Ce qu’il ne peut pas encore faire

- Aucune action métier majeure manquante repérée ; la seule faille est la **protection des pages** (affichage des données sans cookie si on connaît les URLs).

### 7.3 Admin suffisant pour un petit pilote

**Oui** : revue retraits, flags, freeze, ledger, webhooks, campagnes. Suffisant pour opérer un pilote contrôlé une fois le guard admin corrigé (redirection /admin → /admin/login quand pas de cookie).

### 7.4 Trous ops

- Redirection des pages admin non appliquée (même cause : proxy non branché).

---

## 8. Audit DB / argent / cohérence métier

### 8.1 Campaign billing

- bill_campaign_on_activate (coût par réponse, total, vérification org_balances), insufficient_org_credit.  
  Preuve : 0011, 0012, 0014.

### 8.2 Org topups

- org_topups (stripe_checkout_session_id unique), org_credit_topup, org_ledger_entries.  
  Preuve : 0015, 0016, 0017.

### 8.3 Webhook idempotence

- 23505 sur org_topups → 200 sans re-crédit ; webhook_events upsert (provider, event_id).  
  Preuve : webhook/route.ts, 0015, 0019.

### 8.4 Org ledger / user ledger

- org_ledger_entries (reason, campaign_id) ; ledger_entries (entity_type, reason, ref_id, status).  
  Preuve : 0011, 0016, 0017, 0001, 0004.

### 8.5 Pending / available

- user_balances, triggers et RPC (réponse → pending ; validation → available), request_withdrawal débit available.  
  Preuve : 0004, 0005, 0020, 0022.

### 8.6 request_withdrawal / admin_decide_withdrawal

- request_withdrawal : gel, limites jour, montant min, solde ; création withdrawal + ledger. admin_decide_withdrawal : paid (external_reference, payment_channel, admin_note) ou rejected (rejection_reason, admin_note), mise à jour ledger.  
  Preuve : 0018, 0020, 0022.

### 8.7 Daily limits / flags / trust / devices / risk controls

- trust_daily_limits, get_user_daily_limit_status, trigger responses, request_withdrawal ; user_risk_controls ; user_devices ; flags (admin_note, review).  
  Preuve : 0020, 0021, 0022.

### 8.8 source_campaign_id / reason labels billing

- source_campaign_id (0024) ; ledger reason labels (ledgerReasonLabels.ts) pour affichage.  
  Preuve : 0024, dashboard lib.

### Verdict

- **Cohérence financière** : Oui (soldes, ledger, topup, billing campagne, retrait).
- **Fragilité** : Aucune incohérence de schéma repérée ; le risque principal reste une erreur de configuration (Stripe, webhook, env).
- **Bloquants** : Aucun identifié côté DB/argent pour un premier pilote.

---

## 9. Audit sécurité / fraude / qualité

### 9.1 RLS

- users, user_balances : propre (own). campaigns, responses : selon org ou authenticated. user_risk_controls, user_devices, webhook_events, ledger_entries (user), flags : pas de policy (service_role / RPC).  
  Preuve : migrations.

### 9.2 Service role

- Utilisé uniquement côté serveur (supabaseAdmin) : webhook, adminData, API admin. Pas d’exposition client repérée.

### 9.3 Auth entreprise / admin

- Entreprise : magic link ; vérification org_members sur create-checkout. Admin : passphrase + cookie ; **redirection admin non appliquée** (middleware).

### 9.4 user_devices / flags / freeze / trust limits

- Device : hash uniquement, pas de policy client. Flags : lecture/écriture admin. Freeze : user_risk_controls, appliqué dans request_withdrawal. Limites : trigger + RPC.

### 9.5 Webhook

- Vérification signature Stripe (constructEvent). Pas de traitement sans signature valide.

### 9.6 Surfaces d’abus / fuites

- **Risque** : Sans guard actif, accès direct aux URLs dashboard/admin peut exposer des pages (données vides ou erreurs RLS pour dashboard ; **données admin** si quelqu’un appelle les mêmes requêtes serveur que les pages admin — les pages sont rendues côté serveur avec supabaseAdmin, donc le contenu peut être renvoyé même sans cookie si on accède à /admin).  
  À confirmer en test : en l’état, les routes API admin sont protégées ; les **pages** admin exécutent getAdminOverviewStats(), getAdminUsers(), etc. sans vérifier la session en amont dans le layout. Donc **lecture des données admin possible sans cookie** tant que le layout ne redirige pas (et la redirection est dans proxy non exécuté).

### Verdict

- **Déjà verrouillé** : RLS user/org, service_role côté serveur, webhook signature, gel et limites côté RPC, devices en hash.
- **Faible** : Protection des **pages** dashboard et admin (middleware non branché).
- **Acceptable pour un petit pilote** : Oui après correction du guard (middleware).

---

## 10. Audit docs / scripts / réalité pilot

### 10.1 Quickstarts

- pilot-startup-quickstart.md, pilot-seed-quickstart.md : présents et cohérents avec les scripts et le seed.  
  Preuve : docs/.

### 10.2 Smoke / prelaunch / dry run / go-no-go

- pilot-smoke.ps1 (structure, env, routes, docs, typecheck, build en WARN), prelaunch-dashboard-check.ps1 (typecheck + next build), pilot-go-no-go.ps1, pilot-dry-run-report.md, pilot-go-no-go-matrix.md.  
  Preuve : scripts/, docs/.

### 10.3 Seed pilot

- pilot_seed.sql, pilot_reset.sql, pilot-seed.ps1, pilot-reset.ps1, pilot-seed-dataset.md.  
  Preuve : supabase/seed/, scripts/, docs/.

### 10.4 Case study / proof pack

- case-study-template.md, campaignProof.ts (proofPackToMarkdown), proof-capture-and-client-reference-runbook.md.  
  Preuve : docs/, dashboard/src/lib/.

### 10.5 Business / acquisition user pack

- pilot-business-pack.ps1, user-supply-pack.ps1 ; docs (pilot-offer-one-pager, checklist-onboard-pilot-company, user-pilot-supply-plan, etc.).  
  Preuve : scripts/, docs/.

### 10.6 KPI spec / repeat definition

- pilot-kpi-minimum-spec.md, repeat-enterprise-definition.md ; RPC et affichage alignés.  
  Preuve : docs/, 0023.

### Verdict

- **Docs alignées au code** : Oui pour les flows décrits ; la doc suppose un “middleware” qui redirige alors qu’il n’est pas actif.
- **Scripts utiles** : Oui (smoke, prelaunch, seed, reset, go-no-go, business pack, user supply).
- **Manque** : Expliciter que le guard doit être branché (middleware.ts appelant proxy) ou documenter la procédure de déploiement qui l’active.

---

## 11. Audit readiness business

- **Vendable** : Offre pilote, one-pager, checklists, runbooks présents ; pas de grille tarifaire publique dans le repo (volontaire).
- **Démontrable** : Oui (démo 10 min, seed, scénarios critiques).
- **Pilotable** : Oui fonctionnellement ; **sous réserve** de la correction du guard (middleware).
- **Mesurable** : KPI pilot, repeat, qualité, proof pack, ledger.
- **Repeat** : Défini et implémenté (get_org_repeat_baseline, source_campaign_id, V2).
- **Opérable** : Admin suffisant (retraits, flags, freeze, ledger, webhooks) ; guard admin à corriger.

**Verdict business** : **Prêt pour 1 pilote contrôlé**, à condition de : (1) brancher le middleware (ou équivalent) pour login et admin, (2) exécuter prelaunch + smoke, (3) valider manuellement les scénarios critiques et l’env Stripe/Supabase. **Pas prêt pour scale** sans renforcement des contrôles et de la surveillance.

---

## 12. Ce qu’on a peut-être oublié

- **Middleware non branché** : La logique dans `proxy.ts` n’est jamais exécutée. C’est le point le plus critique pour “prêt pilote”.
- **Nom du repo** : README et package.json racine “VoxSnap” alors que tout le reste est “PulsePanel” — confusion pour onboarding.
- **Tests** : Aucun test E2E ; validation pilot = manuelle + smoke structurel (doc pilot-critical-scenarios-mission-report).
- **Vérification build** : Le build dashboard n’a pas été lancé pendant l’audit ; les rapports dry run indiquent PASS sous réserve d’env.
- **Routes “mortes”** : Aucune route morte évidente ; proxy.ts est du “code mort” du point de vue exécution (non importé).
- **Migrations** : Aucune incohérence détectée entre migrations (ordre, contraintes, RPC).
- **Features documentées mais non utilisées** : Le “middleware” documenté (no-access, select-org) n’est pas appliqué.
- **Risque premier pilote** : Un opérateur pourrait accéder à /admin sans passphrase (affichage des données) ; un utilisateur pourrait accéder au dashboard sans login (comportement selon RLS). Correction = un seul point : activer le guard (middleware).

---

## 13. Priorisation P0 / P1 / P2 / P3

### P0 — Bloque un vrai pilote

| Intitulé | Pourquoi | Impact | Urgence | Effort |
|----------|----------|--------|---------|--------|
| Activer le guard des routes (middleware) | Sans lui, pas de redirect /login, /select-org, /no-access ni /admin → /admin/login ; données admin accessibles sans cookie. | Sécurité et conformité au runbook. | Immédiat. | Faible (créer middleware.ts qui appelle proxy ou renommer/exporter default). |

### P1 — À traiter vite après P0

| Intitulé | Pourquoi | Impact | Urgence | Effort |
|----------|----------|--------|---------|--------|
| Vérifier build dashboard (prelaunch) | Garantir que la gate technique est verte avant J0. | Confiance déploiement. | Avant J0. | Faible. |
| Aligner nom repo (README / package.json) | “VoxSnap” vs “PulsePanel” crée de la confusion. | Clarté produit. | Moyen. | Faible. |
| Documenter le wiring du middleware | Éviter que le correctif ne soit oublié ou désactivé. | Ops / onboarding. | Moyen. | Faible. |

### P2 — Après premier pilote

| Intitulé | Pourquoi | Impact | Urgence | Effort |
|----------|----------|--------|---------|--------|
| Redirection explicite dans admin layout | En plus du middleware, redirect côté layout si !session pour défense en profondeur. | Sécurité. | Moyen. | Faible. |
| Tests E2E sur flows critiques | Réduire la dépendance à la validation manuelle. | Qualité, régression. | Moyen. | Élevé. |

### P3 — Confort / scale

| Intitulé | Pourquoi | Impact | Urgence | Effort |
|----------|----------|--------|---------|--------|
| Lint dans prelaunch | Rapport prelaunch-build-hardening le mentionne comme optionnel. | Qualité code. | Bas. | Faible. |
| Lien admin webhook → org_topups | Doc stripe-webhook-events-audit-report suggère un lien “Voir le topup” depuis détail webhook. | Confort ops. | Bas. | Faible. |

---

## 14. Verdict final

### 14.1 Ce qui est vraiment prêt

- Backend Supabase (tables, RLS, RPC, triggers) : ledger, billing org, retraits, gel, limites journalières, trust, user_devices, webhook_events, qualité campagne, repeat, duplication V2.
- Mobile : onboarding, feed, answer, wallet (pending/available, retrait, erreurs limite/gel), profil (trust, limites jour), enregistrement device.
- Dashboard : login (magic link), select-org, no-access, home, création/détail campagne, billing (Stripe), withdrawals, proof pack, qualité, KPI, repeat.
- Admin : overview, users (freeze/unfreeze), withdrawals (decide tracé), flags (review + note), ledger, webhooks, campaigns cross-org.
- Stripe : create-checkout, webhook (signature, idempotence, webhook_events).
- Docs et scripts : quickstarts, smoke, prelaunch, dry run, go-no-go, seed, business pack, user supply, scénarios critiques, case study template.

### 14.2 Ce qui ne l’est pas

- **Guard des routes** : La logique existe dans `dashboard/proxy.ts` mais n’est pas exécutée (aucun `middleware.ts`). Donc : pas de redirection automatique vers /login, /select-org, /no-access, ni vers /admin/login pour les pages admin.
- **Build dashboard** : Non exécuté pendant l’audit (non vérifié).
- **Nom repo** : Incohérence VoxSnap / PulsePanel dans README et package.json racine.

### 14.3 Le projet est-il réellement prêt pour un premier pilote ?

**Oui, sous conditions.**

- **Condition 1** : Activer le guard des routes en exposant la logique de `proxy.ts` comme middleware Next.js (créer `middleware.ts` qui exporte default et appelle cette logique, ou équivalent).
- **Condition 2** : Exécuter `prelaunch-dashboard-check.ps1` et `pilot-smoke.ps1` et corriger tout FAIL.
- **Condition 3** : Valider manuellement les scénarios critiques (docs/pilot-critical-scenarios.md) et l’environnement (Stripe, webhook, Supabase).
- **Condition 4** : Si démo/seed utilisé : exécuter le seed pilot, associer le compte entreprise, faire un topup test.

Sans la **condition 1**, le projet n’est pas considéré comme “prêt” du point de vue sécurité et conformité à la doc (redirections login et admin).

### 14.4 Synthèse tableau (VERIFIED / PARTIAL / FALSE / ABSENT / NON VERIFIABLE)

- **VERIFIED** : 22 affirmations sur 30 (voir tableau section 4).
- **PARTIAL** : 3 (console admin protégée, auth dashboard réelle, projet pilotable).
- **FALSE** : 0.
- **ABSENT** : 0.
- **NON VERIFIABLE** : 1 (build dashboard vert).

---

*Fin du rapport d’audit — Lecture seule, aucun fichier modifié.*
