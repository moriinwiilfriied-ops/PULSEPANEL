# Scénarios critiques pilot — PulsePanel

Document central pour valider les flows bout en bout avant démo / pilot. À cocher (Pass / Fail / Blocked).

**Dataset démo** : pour disposer d’une org et de 5 campagnes prêtes (packaging, slogan, pricing, concept, NPS), utiliser le seed pilot : `docs/pilot-seed-quickstart.md`. Les campagnes seed ont le préfixe `[Pilot]` et sont en paused ; après topup org, en activer une pour les scénarios 2, 4, 9.

**Supply user** : les scénarios mobile (réponse, wallet, retrait) supposent des users disponibles. Pour recruter 200–500 users pilot propres et surveiller la qualité : `docs/user-pilot-supply-plan.md`, `docs/checklist-source-to-first-campaign.md`, `docs/user-acquisition-fraud-guardrails-runbook.md`.

---

## 1. Login dashboard entreprise

| Élément | Détail |
|--------|--------|
| **Prérequis** | Compte Supabase Auth (email/OTP ou autre), org créée et liée (ensureOrg ou manuel). |
| **Étapes** | 1) Aller sur l’URL du dashboard. 2) Se connecter (OTP si configuré). 3) Si multi-org : sélectionner l’org (ou être redirigé vers `/select-org`). 4) Accéder à la page d’accueil dashboard (campagnes, crédit visible). |
| **Résultat attendu** | Utilisateur authentifié, org contextuelle chargée, pas de boucle de redirect, header crédit cohérent. |
| **Preuves** | Capture : page d’accueil avec crédit org (ou liste campagnes). URL `/` ou `/campaigns`. |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## 2. Création campagne

| Élément | Détail |
|--------|--------|
| **Prérequis** | Login dashboard, org sélectionnée, crédit org suffisant (ou campagne en brouillon sans activation). |
| **Étapes** | 1) Aller sur `/campaigns/new`. 2) Renseigner nom, question, options, quota, reward. 3) Créer la campagne. 4) Si funding OK : activer / publish. 5) Vérifier statut (active / paused) et cohérence (liste campagnes, détail). |
| **Résultat attendu** | Campagne créée, statut cohérent, si activation : débit org visible (billing/ledger), campagne visible côté mobile si active. |
| **Preuves** | Capture : détail campagne (statut, quota, reward). Capture ou ligne ledger : raison « Activation campagne » après activation. |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## 3. Topup Stripe / crédit org

| Élément | Détail |
|--------|--------|
| **Prérequis** | Dashboard configuré (Stripe env), webhook Stripe configuré vers l’API du projet. |
| **Étapes** | 1) Depuis `/billing`, lancer une recharge (create-checkout). 2) Compléter le flux Stripe (test ou réel). 3) Retour après succès. 4) Vérifier crédit org mis à jour. 5) Vérifier une ligne ledger (Recharge Stripe). 6) Optionnel : Admin → Ledger → org_ledger_entries avec raison mappée. |
| **Résultat attendu** | Crédit org augmente, ledger enregistre une entrée (stripe_checkout / topup_stripe), libellé « Recharge Stripe » affiché. |
| **Preuves** | Capture billing (solde avant/après). Capture admin ledger ou export CSV : ligne topup avec label. |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## 4. Réponse mobile valide

| Élément | Détail |
|--------|--------|
| **Prérequis** | Campagne active, user mobile identifié, campagne visible dans le feed. |
| **Étapes** | 1) Ouvrir l’app mobile. 2) Voir une campagne dans le feed. 3) Répondre (answer) avec une réponse valide. 4) Vérifier crédit pending (wallet). 5) Vérifier cohérence trust / qualité si visible (admin user ou campagne). |
| **Résultat attendu** | Réponse enregistrée, crédit pending crédité, pas d’erreur inattendue, qualité/trust cohérents. |
| **Preuves** | Capture mobile : feed → answer → wallet (pending). Optionnel : Admin → User ou Campaign → qualité / responses. |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## 5. Limites journalières

| Élément | Détail |
|--------|--------|
| **Prérequis** | User avec trust_daily_limits (ex. Bronze 10/500/1). Données de test : user ayant déjà atteint la limite du jour (UTC). |
| **Étapes** | 1) Tenter une nouvelle réponse alors que la limite (valid responses ou reward cents) est atteinte. 2) Tenter une demande de retrait alors que max_withdrawal_requests_per_day est atteint. |
| **Résultat attendu** | Refus propre côté API/app (message lisible), pas de crédit accordé, pas de crash. |
| **Preuves** | Capture ou log : message d’erreur (ex. limite atteinte). Admin user detail : usage du jour affiché. |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## 6. Demande de retrait

| Élément | Détail |
|--------|--------|
| **Prérequis** | User avec solde disponible ≥ minimum (500 cents), pas de gel (withdrawals_frozen = false), limites journalières OK. |
| **Étapes** | 1) Depuis l’app mobile, aller au wallet. 2) Demander un retrait (montant valide). 3) Vérifier que la demande est créée (pending). 4) Vérifier refus propre si gel ou limite (message clair). |
| **Résultat attendu** | Si conditions OK : withdrawal en pending, solde mis à jour (pending). Si gel/limite : message d’erreur, pas de création. |
| **Preuves** | Capture mobile : avant/après demande. Admin → Withdrawals : nouvelle ligne pending. |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## 7. Revue admin retrait

| Élément | Détail |
|--------|--------|
| **Prérequis** | Au moins un retrait en pending. Accès admin (passphrase). |
| **Étapes** | 1) Admin → Withdrawals → ouvrir un retrait pending. 2) Vérifier user, montant, statut. 3) Test rejet : Rejeter avec motif + note admin. Vérifier remboursement solde. 4) Test paid : (après virement externe simulé ou réel) Marquer payé avec référence externe, canal, note admin. |
| **Résultat attendu** | Rejet : statut rejected, solde user remboursé. Paid : statut paid, référence/canal/note enregistrés, traçabilité lisible. |
| **Preuves** | Capture détail retrait (rejected puis paid). Ligne withdrawal en base ou export avec référence externe. |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## 8. Flags / gel retraits

| Élément | Détail |
|--------|--------|
| **Prérequis** | Au moins un flag (ex. too_fast, empty_answer). Accès admin. |
| **Étapes** | 1) Admin → Flags → ouvrir un flag. 2) Revoir le flag : Legit / Watch / Geler les retraits (avec motif + note). 3) Si gel : aller sur Admin → Users → [user] → vérifier « Gel retraits » actif. 4) Depuis mobile (ou API) : tenter request_withdrawal pour ce user → refus propre (retraits gelés). 5) Dégeler depuis admin → vérifier que le user peut à nouveau demander un retrait. |
| **Résultat attendu** | Décisions flag tracées, gel bloque les nouvelles demandes de retrait, dégel rétablit la possibilité. |
| **Preuves** | Capture flag détail (action + note). Capture user détail (gel/dégel). Capture mobile ou message d’erreur « retraits indisponibles ». |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## 9. Campagnes admin

| Élément | Détail |
|--------|--------|
| **Prérequis** | Plusieurs campagnes (plusieurs orgs si possible). Accès admin. |
| **Étapes** | 1) Admin → Campaigns. 2) Vérifier visibilité cross-org (liste avec org, statut, qualité). 3) Ouvrir une campagne. 4) Si applicable : Pause / Reprendre / Terminer. 5) Vérifier que le statut est mis à jour et visible côté dashboard org. |
| **Résultat attendu** | Liste campagnes toutes orgs, détail avec qualité, actions status fonctionnelles, pas de régression billing/triggers. |
| **Preuves** | Capture liste admin campaigns. Capture détail + action status. |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## 10. Webhooks admin

| Élément | Détail |
|--------|--------|
| **Prérequis** | Au moins un webhook_event en base (ex. après un topup Stripe ou un appel API webhook). Accès admin. |
| **Étapes** | 1) Admin → Webhooks (liste des événements). 2) Ouvrir un événement (détail). 3) Vérifier statut (processed / ignored / error), payload ou résumé si affiché. |
| **Résultat attendu** | Liste lisible, détail d’un webhook_event avec statut et infos utiles pour le debug. |
| **Preuves** | Capture liste webhooks. Capture détail d’un événement (id, type, statut). |
| **Statut** | [ ] Pass  [ ] Fail  [ ] Blocked |

---

## Légende statut

- **Pass** : scénario exécuté, résultat attendu obtenu, preuves capturées si demandé.
- **Fail** : scénario exécuté mais résultat incorrect ou erreur bloquante.
- **Blocked** : impossible à exécuter (prérequis manquant, env, données).

Utiliser `docs/pilot-evidence-matrix.md` pour tracer où trouver les preuves et qui valide.
