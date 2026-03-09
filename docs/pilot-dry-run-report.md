# Rapport dry run — Premier pilote PulsePanel

**Mission** : PILOT_DRY_RUN_AND_GO_NO_GO_01  
**Objectif** : Dry run complet, décision GO / NO-GO, centralisation des preuves et des bloqueurs.

---

## 1. Vérifications initiales

### Scripts / checklists confirmés

- **scripts/prelaunch-dashboard-check.ps1** : présent ; typecheck (node + tsc) + next build (npm.cmd).
- **scripts/pilot-smoke.ps1** : présent ; structure, env, routes clés, docs pilot, typecheck (étape 5), build (étape 5b), mobile config.
- **scripts/pilot-seed.ps1**, **scripts/pilot-reset.ps1** : présents (seed/reset pilot).
- **docs/prelaunch-technical-checklist.md** : env, build, login, select-org, create campaign, billing, mobile, wallet, admin, webhooks, blockers.
- **docs/pilot-critical-scenarios.md** : 10 scénarios (login, création campagne, topup, réponse mobile, limites, retrait, revue retrait, flags/gel, campagnes admin, webhooks) + proof.
- **docs/pilot-evidence-matrix.md** : preuves par scénario, où trouver, qui valide.
- **docs/pilot-seed-quickstart.md**, **docs/demo-script-10min.md** : présents.

### Flows critiques confirmés (revue de code)

- **Login** : signInWithOtp (LoginForm.tsx), auth/callback, redirect /select-org ou /.
- **Select-org / no-access** : dashboardAuth, middleware, redirects.
- **Create campaign** : createCampaign (supabaseCampaigns.ts), /campaigns/new.
- **Duplicate V2** : duplicateCampaign, page détail campagne.
- **Billing** : create-checkout (API), webhook Stripe → webhook_events, org_topups, crédit org.
- **Mobile answer** : submitResponseToSupabase (supabaseApi.ts), answer.tsx.
- **Wallet** : fetchWalletFromSupabase, requestWithdrawal (supabaseApi.ts), wallet.tsx.
- **Retraits** : request_withdrawal (RPC), withdrawals_frozen (user_risk_controls), refus si gel.
- **Admin** : admin_decide_withdrawal (RPC), API freeze/unfreeze, flags review (legit/watch/freeze), webhooks (webhook_events), campagnes cross-org.
- **Proof pack** : buildCampaignProofPack, proofPackToMarkdown, bloc détail campagne.
- **Qualité campagne** : getCampaignQualityStats, get_campaign_quality_deep, campaignQualityInsights, section Qualité + À retenir.

### Zones sensibles confirmées

- useSearchParams : corrigé (Suspense) sur /login et admin/withdrawals.
- webhook_events : table + audit dans webhook route, admin webhooks.
- withdrawals_frozen, user_risk_controls : RPC, admin user detail, flag review.
- trust_daily_limits, get_user_daily_limit_status : migrations 0022, enforcement réponse + request_withdrawal.
- source_campaign_id : duplication V2.

### Stratégie dry run retenue

1. Exécuter prelaunch-dashboard-check.ps1 et pilot-smoke.ps1.
2. Confronter scénarios critiques aux implémentations (code + docs).
3. Produire matrice GO/NO-GO, rapport dry run, checklist J0, watchpoints 48h.
4. Mettre à jour pilot-evidence-matrix (section Dry run).
5. Aucune correction sauf P0 prouvé et local.

---

## 2. Exécution du dry run

### Environnement testé

- **OS** : Windows (contexte exécution scripts).
- **Repo** : PulsePanel, racine avec dashboard/, mobile/, scripts/, docs/, supabase/.
- **Seed** : non exécuté (pas de base Supabase locale dans le dry run auto).

### Scripts exécutés

| Script | Résultat | Détail |
|--------|----------|--------|
| prelaunch-dashboard-check.ps1 | **PASS** | Typecheck PASS, next build PASS. |
| pilot-smoke.ps1 | **PASS** (2 WARN) | 25 PASS, 0 FAIL. WARN : étape 5 (tsc --noEmit), étape 5b (next build) — échec dans le contexte d’exécution du smoke (npm/node path). Gate stricte = prelaunch. |

### Revue checklist technique (prelaunch-technical-checklist.md)

- Blocs 1–12 couverts par la checklist.
- Build vert : vérifié par prelaunch.
- Points 4–11 (login, select-org, create campaign, billing, mobile answer, wallet, admin, webhooks) : **vérification manuelle requise avant J0** (non automatisée dans ce dry run).

### Scénarios joués (mode revue code + docs, pas exécution manuelle navigateur)

| # | Scénario | État | Preuve attendue | Blocage éventuel | Impact lancement |
|---|----------|------|-----------------|------------------|------------------|
| 1 | Login dashboard entreprise | Implémenté | Page accueil, crédit/org | Aucun en code | Vérifier manuellement |
| 2 | Select-org / no-access | Implémenté | Choix org, redirect | Aucun en code | Vérifier manuellement |
| 3 | Create campaign | Implémenté | Campagne créée, ledger | Aucun en code | Vérifier manuellement |
| 4 | Billing / topup / reflet crédit | Implémenté | Crédit + ligne ledger | Env Stripe + webhook | Topup test avant J0 |
| 5 | Campaign detail + KPI + qualité + V2 | Implémenté | Détail, qualité, duplication, proof | Aucun en code | Vérifier manuellement |
| 6 | Mobile feed → answer | Implémenté | Réponse, pending wallet | Campagne active + user | Vérifier manuellement |
| 7 | Wallet pending / available | Implémenté | Solde, historique | Aucun en code | Vérifier manuellement |
| 8 | Request withdrawal | Implémenté | Pending ou message refus | Gel/limites | Vérifier manuellement |
| 9 | Admin review withdrawal | Implémenté | Reject/paid, traçabilité | Aucun en code | Vérifier manuellement |
| 10 | Admin flags / freeze | Implémenté | Action flag, gel actif | Aucun en code | Vérifier manuellement |
| 11 | Admin webhooks | Implémenté | Liste, détail event | Aucun en code | Vérifier manuellement |
| 12 | Proof pack / copy summary | Implémenté | Résumé, copie Markdown | Campagne terminée | Vérifier manuellement |

Aucun scénario en Fail ou Blocked au regard du code et des docs. Tous dépendent d’une **vérification manuelle** avant premier pilote.

---

## 3. Résultats et preuves collectées

- **Preuves automatiques** : sortie prelaunch (PASS), sortie smoke (PASS, 2 WARN).
- **Preuves code** : présence des flows listés en section 1 (grep / lecture fichiers).
- **Preuves manuelles** : à collecter lors du passage réel des scénarios (captures, checklist technique, evidence-matrix avec date et validant).

---

## 4. Liste P0 / P1 / P2

- **P0 (bloquant lancement)** : Aucun identifié. Build vert, routes et flows critiques présents.
- **P1 (à traiter avant ou au lancement)** :
  - Exécution manuelle des 10 scénarios + proof pack avant J0.
  - Vérification env : Supabase, Stripe, webhook, (optionnel) seed.
  - Smoke : 2 WARN (typecheck/build) dans certains env — utiliser prelaunch pour la gate.
- **P2 (surveillance post-lancement)** :
  - Qualité réponses, flags, shared devices, limites journalières, retraits, webhooks, ledger, UX dashboard/wallet (voir post-launch-watchpoints.md).

---

## 5. Recommandation finale de lancement

**GO with watchpoints.**

- **GO** : Build vert (prelaunch), smoke OK (0 FAIL), tous les flows critiques implémentés et documentés. Aucun P0.
- **Watchpoints** : (1) Valider en manuel la checklist technique et les scénarios critiques avant J0. (2) Utiliser prelaunch-dashboard-check.ps1 comme gate build, pas uniquement le smoke. (3) Vérifier Stripe + webhook avant premier topup. (4) Appliquer launch-day-checklist.md et post-launch-watchpoints.md (48h).

---

## 6. Fichiers livrés par la mission

- docs/pilot-go-no-go-matrix.md
- docs/pilot-dry-run-report.md (ce document)
- docs/launch-day-checklist.md
- docs/post-launch-watchpoints.md
- docs/pilot-evidence-matrix.md (mis à jour, section Dry run)
- scripts/pilot-go-no-go.ps1 (optionnel)

---

## 7. Conclusion finale

- **GO** : Oui, sous condition des watchpoints.
- **GO with watchpoints** : Oui. Build vert, flows implémentés, aucun P0. Exécuter checklist technique + scénarios critiques en manuel avant J0 ; utiliser prelaunch comme gate ; surveiller 48h (post-launch-watchpoints).
- **NO-GO** : Non retenu. Aucun blocage technique prouvé ne justifie un NO-GO à ce stade.

---

## 8. Ce qui restera après le premier pilote

- Remplir les colonnes Date test / Qui valide dans pilot-evidence-matrix après passage manuel des scénarios.
- Traiter les P1/P2 identifiés en production (WARN smoke dans certains env, qualité réponses, flags, etc.).
- Ajuster les seuils des watchpoints 48h si les retours terrain le demandent.
- Idées « après premier pilote » : à lister hors mission (pas de code ici).
