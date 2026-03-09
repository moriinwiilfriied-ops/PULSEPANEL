# Checklist — Lancer une campagne (pilot)

À suivre avant d’activer une campagne en conditions réelles.

---

## Avant création

- [ ] **Login dashboard** avec le compte org concerné.
- [ ] **Org sélectionnée** : vérifier en haut de page (sélecteur d’org si multi-org).
- [ ] **Crédit disponible** : header ou page Billing — solde suffisant pour le coût total de la campagne (quota × coût unitaire).

## Création

- [ ] **Campagne relue** : nom, question, options, ciblage si applicable.
- [ ] **Quota** et **reward_cents** vérifiés (cohérents avec le budget et la politique).
- [ ] **Coût** : vérifier l’estimation (coût total / coût par réponse) affichée.

## Activation

- [ ] **Activer / Publish** uniquement quand tout est validé (l’activation déclenche le débit org).
- [ ] **Vérification** : après activation, statut = active ; une ligne ledger « Activation campagne » apparaît ; crédit org diminué.

## Après lancement

- [ ] **Dashboard** : la campagne apparaît dans la liste avec le bon statut.
- [ ] **Admin** (si besoin) : Admin → Campaigns — la campagne visible cross-org, qualité disponible après premières réponses.

---

**Blocage fréquent** : crédit org insuffisant → recharger via Billing (Stripe) avant d’activer.
