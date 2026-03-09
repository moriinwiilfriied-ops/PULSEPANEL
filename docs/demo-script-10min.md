# Script démo 10 min — PulsePanel

Démo réaliste : vitesse, qualité, contrôle. Pas de promesse sur des features non prêtes.

**Optionnel avant la démo** : lancer le seed pilot (`docs/pilot-seed-quickstart.md`) pour avoir l’org « PulsePanel Pilot » et 5 campagnes [Pilot] prêtes (paused). Associer son compte à cette org, faire un topup si besoin, puis activer une campagne pour montrer le flux sans créer une campagne from scratch.

---

## 1. Login entreprise (1 min)

- Ouvrir le dashboard. Se connecter (OTP ou session).
- Montrer la sélection d’org si multi-org.
- **Message clé** : « Un seul dashboard par org, auth réelle, pas de mock. »

---

## 2. Création / vue campagne (2 min)

- Aller sur **Campagnes** → **Nouvelle campagne**.
- Renseigner nom, question, options, quota, reward (valeurs de démo).
- Montrer l’estimation de coût. Créer.
- **Message clé** : « La campagne est créée ; l’activation déclenche le débit du crédit org. »

---

## 3. Funding / billing (1 min 30)

- Aller sur **Billing**. Montrer le solde et l’historique ledger (libellés lisibles : Activation campagne, Recharge Stripe).
- Expliquer : « Recharge via Stripe ; le webhook crédite l’org et tout est tracé dans le ledger. »
- Pas besoin de faire un vrai paiement en démo si pas le temps.

---

## 4. Vue admin : campaigns / users / flags / webhooks (2 min)

- Passer en **Admin** (passphrase si configurée).
- **Campaigns** : liste cross-org, qualité (valid/invalid, too_fast, etc.), actions Pause / Reprendre / Terminer.
- **Users** : liste, détail (solde, gel, usage journalier).
- **Flags** : ex. flags qualité (too_fast, empty), revue (Legit / Watch / Geler retraits).
- **Webhooks** : liste des événements (ex. Stripe), statut processed/ignored/error.
- **Message clé** : « Un seul endroit pour le pilot : campagnes, risque, retraits, technique. »

---

## 5. Mobile : répondre à une campagne (1 min 30)

- Ouvrir l’app mobile (simulateur ou device).
- Montrer le feed, une campagne, répondre.
- **Message clé** : « Réponse enregistrée, crédit pending immédiat. »

---

## 6. Wallet / pending (1 min)

- Onglet Wallet : solde, pending, historique.
- « Le retrait est une demande ; le paiement réel est fait manuellement par l’équipe, puis marqué payé dans l’admin. »

---

## 7. Retrait manuel expliqué (1 min)

- Revenir sur l’admin. **Withdrawals** → un retrait pending.
- Montrer le détail : user, montant, statut. Expliquer : « On effectue le virement en dehors de l’app, puis on marque payé avec la référence externe. Rejet possible avec motif et remboursement du solde. »

---

## 8. Conclusion (30 s)

- « PulsePanel : campagnes, réponses, crédit et retraits tracés ; admin pour la qualité, le gel et les paiements ; billing Stripe et ledger cohérents. Pilot prêt sans improvisation. »
- **Optionnel** : montrer une campagne **terminée** → bloc « Résumé preuve » + « Copier le résumé » pour illustrer comment récupérer une preuve commerciale (chiffre fort, mini case study). Voir `docs/proof-capture-and-client-reference-runbook.md` et `docs/case-study-template.md`.

**Exécution pilot business** : offre, ICP, pipeline, templates et checklists : `docs/pilot-offer-one-pager.md`, `docs/lead-to-repeat-runbook.md`, `docs/checklist-onboard-pilot-company.md`, `docs/checklist-post-campaign-proof-repeat.md`.

---

**Rappel** : ne pas montrer de feature non livrée. En cas de bug en direct, passer à la section suivante et noter pour correction.
