# Matrice GO / NO-GO — Premier pilote PulsePanel

Source de vérité pour la décision de lancement. Mise à jour après dry run : `docs/pilot-dry-run-report.md`.

---

## Catégories et statut

| Catégorie | Point | Statut | Gravité | Bloquant lancement | Action requise |
|-----------|--------|--------|---------|--------------------|----------------|
| **Produit** | Build dashboard vert | OK | — | Oui | Aucune. Prelaunch check PASS. |
| **Produit** | Routes critiques présentes | OK | — | Oui | Aucune. login, select-org, campaigns, billing, admin, auth/callback confirmés. |
| **Entreprise / dashboard** | Login OTP | Implémenté | — | Oui | Vérifier manuellement avant J0 : lien magique reçu, callback → select-org ou /. |
| **Entreprise / dashboard** | Select-org / no-access | Implémenté | — | Oui | Vérifier manuellement : choix org, redirect, pas de crash. |
| **Entreprise / dashboard** | Création campagne | Implémenté | — | Oui | Vérifier manuellement : /campaigns/new → création → détail. |
| **Entreprise / dashboard** | Détail campagne (KPI, qualité, V2, proof) | Implémenté | — | Non | Vérifier manuellement : qualité, À retenir, duplication V2, copie résumé preuve. |
| **Billing** | Topup Stripe + reflet crédit | Implémenté | — | Oui | Vérifier env Stripe + webhook ; un topup test avant J0. |
| **Billing** | Ledger / raisons | Implémenté | — | Non | Admin Ledger si besoin. |
| **Mobile / user** | Feed → answer | Implémenté | — | Oui | Vérifier : campagne active, réponse enregistrée, pending wallet. |
| **Mobile / user** | Wallet pending / available | Implémenté | — | Oui | Vérifier affichage solde, historique. |
| **Retraits** | Request withdrawal | Implémenté | — | Oui | Vérifier : demande créée (pending) ou message refus (gel/limite). |
| **Retraits** | Gel bloque retrait | Implémenté | — | Oui | RPC + user_risk_controls ; vérifier message côté app. |
| **Admin / ops** | Revue retrait (reject / paid) | Implémenté | — | Oui | Admin Withdrawals → détail → Rejeter / Marquer payé. |
| **Admin / ops** | Flags + freeze / dégel | Implémenté | — | Oui | Admin Flags → review → gel ; Admin Users → dégel. |
| **Admin / ops** | Campagnes admin (liste, statut) | Implémenté | — | Oui | Admin Campaigns, actions Pause/Reprendre/Terminer. |
| **Admin / ops** | Webhooks admin | Implémenté | — | Non | Liste + détail webhook_events ; vérifier après topup. |
| **Fraude / confiance** | Limites journalières | Implémenté | — | Oui | get_user_daily_limit_status ; refus réponse/retrait si dépassé. |
| **Fraude / confiance** | Trust / qualité campagne | Implémenté | — | Non | Vue qualité + signal + observations. |
| **Preuves / KPI** | Proof pack / copie résumé | Implémenté | — | Non | Détail campagne terminée → Copier résumé (Markdown). |
| **Preuves / KPI** | KPI pilot (repeat, etc.) | Implémenté | — | Non | Admin overview, home dashboard. |

---

## Dépendances dry run

| Élément | Statut dry run | Bloquant |
|--------|----------------|----------|
| prelaunch-dashboard-check.ps1 | PASS | Oui si FAIL |
| pilot-smoke.ps1 | PASS (WARN typecheck/build dans contexte smoke) | Oui si FAIL |
| Seed pilot (org + campagnes) | Non exécuté dans dry run auto | À lancer avant J0 si démo/seed utilisé |
| Stripe (env + webhook) | Non vérifié automatiquement | À vérifier avant premier topup réel |

---

## Conclusion globale

- **GO** : Oui, si vérification manuelle des scénarios critiques (checklist technique + scénarios) avant J0 et env Stripe/Supabase OK.
- **GO with watchpoints** : Oui. Watchpoints : (1) Exécuter manuellement les 10 scénarios + proof pack avant premier pilote. (2) Smoke : 2 WARN possibles (typecheck/build) selon env — utiliser prelaunch pour la gate stricte. (3) Seed : lancer seed si besoin, associer compte entreprise, topup. (4) Surveiller 48h post-lancement (voir `docs/post-launch-watchpoints.md`).
- **NO-GO** : Si prelaunch ou smoke en FAIL non résolu, ou blocage prouvé sur un flow critique (login, billing, retrait, admin) non corrigeable avant la date cible.

---

## Décision retenue (après dry run)

**GO with watchpoints.** Build vert, flows implémentés, aucun P0 identifié en revue de code/scripts. La décision finale GO pour un premier vrai pilote repose sur : exécution manuelle de la checklist technique et des scénarios critiques avant J0, et validation env (Supabase, Stripe, seed si utilisé).
