# Checklist — Onboarding entreprise pilot

À suivre pour embarquer une nouvelle entreprise pilote. À cocher avant le premier lancement de campagne.

---

## 1. Compte entreprise créé / accès validé

- [ ] Compte (email) existant ou créé pour le contact client.
- [ ] Login testé : le contact peut se connecter au dashboard.
- [ ] Si magic link / OTP : le contact a bien reçu et réussi la connexion.

---

## 2. Org liée

- [ ] Organisation créée (ou org dédiée pilot utilisée).
- [ ] Contact ajouté comme **owner** ou **editor** dans `org_members` (via Supabase ou process interne).
- [ ] Sélecteur d’org : le contact voit bien son org et peut la sélectionner.

---

## 3. Campagne seed ou nouvelle campagne choisie

- [ ] Décision : utiliser une campagne seed existante (ex. [Pilot] adaptée) ou créer une **nouvelle** campagne from scratch.
- [ ] Si nouvelle : nom, question, options, quota, récompense définis avec le client (voir checklist lancement).

---

## 4. Budget / topup validé

- [ ] Montant de crédit décidé (ex. 100–300 € pour un premier pilot).
- [ ] Recharge effectuée (Stripe) ou crédit attribué selon process.
- [ ] Solde visible dans le dashboard (Billing) par le client.

---

## 5. Cas d’usage défini

- [ ] Cas d’usage clair : packaging / prix / slogan / concept / NPS.
- [ ] Objectif du test rappelé (ex. « choisir entre 2 packagings », « valider une fourchette de prix »).
- [ ] Attentes réalistes : résultat en 24–72 h, pas un panel représentatif France.

---

## 6. Quota / reward validés

- [ ] Quota fixé (ex. 50, 80, 100 réponses) en fonction du budget et du besoin.
- [ ] Récompense par réponse cohérente (ex. 15–25 ct) ; coût total affiché et accepté par le client.

---

## 7. Date lancement fixée

- [ ] Date/heure de lancement convenue (ou « dès que vous êtes prêt »).
- [ ] Client prévenu qu’après activation le crédit est débité et la campagne part en diffusion.

---

## 8. Point de contact désigné

- [ ] Un contact côté client identifié (email, téléphone si besoin) pour les questions et le suivi.
- [ ] Un contact côté PulsePanel désigné pour le support pilot.

---

## 9. Preuve / KPI attendus définis

- [ ] Client sait qu’il aura : dashboard en direct, export CSV/JSON, résumé preuve (chiffre fort, copie Markdown).
- [ ] Si case study / citation prévus : rappelé que ce sera demandé après la campagne (voir checklist post-campaign).

---

**Blocages fréquents** : crédit non rechargé avant activation ; org non liée au bon compte ; quota trop élevé pour le budget. Vérifier Billing et org avant le jour J.

**Références** : `docs/checklist-launch-campaign.md`, `docs/pilot-offer-one-pager.md`, `docs/checklist-post-campaign-proof-repeat.md`.
