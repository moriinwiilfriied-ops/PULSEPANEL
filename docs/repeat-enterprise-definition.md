# Définition — Repeat entreprise

Source de vérité pour le indicateur « repeat » côté entreprise (org) pendant le pilot.

---

## 1. Ce qu’on appelle « repeat entreprise »

Une **organisation** qui revient après une première campagne : elle en lance au moins une deuxième. On ne mesure pas ici la fréquence des recharges Stripe ni les « repeat purchase » au sens e‑commerce, mais le fait qu’une org **relance au moins une campagne** après la première.

---

## 2. Ce qu’on compte aujourd’hui

- **campaigns_count** : nombre total de campagnes créées par l’org (tous statuts).
- **campaigns_completed_count** : nombre de campagnes avec `status = 'completed'`.
- **repeat_eligible** : org ayant au moins une campagne terminée (campaigns_completed_count >= 1). Base du dénominateur pour un taux.
- **repeat_positive** : org ayant lancé au moins 2 campagnes (campaigns_count >= 2). Base du numérateur.
- **repeat_rate** (global admin) : `orgs_repeat_positive / orgs_repeat_eligible` (orgs avec >= 2 campagnes / orgs avec >= 1 campagne terminée). Si aucune org eligible, 0 ou null.

Pour une **org donnée** (dashboard) : on affiche « X campagnes lancées », « Y après la première » (Y = max(0, X - 1)).

---

## 3. Ce qu’on ne compte pas encore

- Relance après **pause** (passage paused → active) : pas de notion de « campagne relancée » distincte, on compte les campagnes (lignes), pas les réactivations.
- **Délai** entre deux campagnes (time between campaigns).
- **Réachat** de crédit (recharges Stripe) : tracé dans le ledger mais pas agrégé ici comme « repeat purchase ».
- Distinction **premier achat** vs **renouvellement** : pas de tagging métier.

**Duplication** : une campagne peut être créée par duplication (bouton « Créer une V2 »). La campagne copiée a `source_campaign_id` renseigné (référence vers la campagne d’origine). Cela permet à terme de mesurer le repeat « par duplication » (ex. nombre de campagnes avec source_campaign_id non null). Aujourd’hui le repeat baseline reste « >= 2 campagnes par org » sans distinguer créations from scratch vs copies.

---

## 4. Formule retenue actuellement

- **Par org** (dashboard) :
  - `campaigns_count` = count(campaigns where org_id = _org_id)
  - `campaigns_after_first` = max(0, campaigns_count - 1)
- **Global** (admin) :
  - `orgs_repeat_eligible` = nb orgs avec au moins 1 campagne `status = 'completed'`
  - `orgs_repeat_positive` = nb orgs avec au moins 2 campagnes (tous statuts)
  - `repeat_rate` = orgs_repeat_positive / nullif(orgs_repeat_eligible, 0) (ratio, ex. 0.25 = 25 %).

---

## 5. Limites

- Une org avec 2 campagnes créées mais jamais activées compte comme repeat_positive (2 >= 2). On ne filtre pas sur « au moins une campagne active ou terminée » pour le numérateur, pour rester simple.
- Le taux est **cross-org** : il ne dit pas « cette org a répété » mais « quelle part des orgs qui ont terminé au moins une campagne en ont lancé au moins deux ».
- Pas de dimension temporelle (ex. « repeat dans les 30 derniers jours ») dans cette baseline.

---

## 6. Évolution possible

- Ajouter un filtre « au moins une campagne active ou completed » pour repeat_positive.
- Dater les campagnes (created_at) et calculer un délai moyen entre première et deuxième campagne.
- Croiser avec les recharges ledger pour un indicateur « org qui recharge après avoir consommé du crédit ».
- Utiliser `source_campaign_id` pour un indicateur « repeat par duplication » (campagnes créées via V2 / duplication). Voir `docs/campaign-duplication-repeat-runbook.md`.
- **Exécution commerciale** : pour qualifier, signer, livrer et pousser le repeat + intro : `docs/lead-to-repeat-runbook.md`, `docs/pilot-pipeline-minimum.md`.
- **Qualité campagne** : une lecture qualité riche (signal, observations, flags) aide à décider si une campagne est exploitable et présentable comme preuve ; voir `docs/campaign-quality-reading-runbook.md`. Qualité profonde ↔ proof pack ↔ repeat sont alignés (détail campagne, proof pack, KPI pilot).
