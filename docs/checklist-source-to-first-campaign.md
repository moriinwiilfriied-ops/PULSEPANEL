# Checklist — De la source user à la première campagne

Relier la supply user au lancement d’une campagne pilot : quand une source est prête, comment lancer, quoi regarder, go/no-go.

---

## 1. Source user prête

- [ ] **Au moins une source** en statut “Premiers users arrivés” ou “Qualité OK” (voir `docs/user-supply-pipeline-minimum.md`).
- [ ] **Volume minimal** : au moins 30–50 users ayant ouvert l’app (idéalement 50–100 pour une première campagne quota 50–80). Vérifier via Admin → Users ou métrique disponible.
- [ ] **Pas de signal “Source coupée”** sur la source qu’on compte utiliser ; pas de vague récente de qualité dégradée.

---

## 2. Volume minimal dispo

- [ ] **Estimation** : nombre de users actifs (réponse au moins une fois) ou “feed visibles” dans les dernières 48 h. Si < 30, envisager d’attendre un peu ou de lancer une campagne à petit quota (ex. 30).
- [ ] **Entreprise pilote** : une org avec une campagne prête (créée, en paused) ou seed disponible. Voir `docs/pilot-seed-dataset.md`, `docs/checklist-onboard-pilot-company.md`.

---

## 3. Campagne seed / pilot prête

- [ ] **Campagne créée** : question, options, quota, reward validés. Crédit org suffisant (Billing). Voir `docs/checklist-launch-campaign.md`.
- [ ] **Statut** : paused jusqu’au moment du go. Activation = débit crédit + mise en ligne dans le feed.
- [ ] **Cas d’usage** aligné avec la supply : ex. test A/B ou prix si les users sont plutôt “étudiants” ou “communauté” ; éviter une campagne trop technique si la base est très jeune ou très hétéroclite.

---

## 4. KPI à regarder pendant 24 h / 48 h

- [ ] **Progression quota** : réponses / quota en temps réel (dashboard détail campagne). Objectif : au moins 20–30 % du quota en 24 h pour une base 50–100 users (sinon vérifier visibilité feed, ou quota trop élevé).
- [ ] **Qualité** : détail campagne → Qualité (pct_valid, pct_too_fast, pct_empty). Si pct_valid < 60 % ou pct_too_fast > 25 % après 24–48 h → signal d’alerte.
- [ ] **Flags** : Admin → Flags. Si plusieurs flags sur cette campagne dès les premières heures → surveiller ; si explosion → envisager pause campagne et revue source.
- [ ] **Retraits** : Admin → Withdrawals. Pas de rafale anormale de demandes ; si oui, revue et possible gel (voir `docs/flags-and-withdrawal-freeze-runbook.md`).

---

## 5. Signaux de qualité suffisants

- [ ] **pct_valid** raisonnable (≥ 65–70 % après 48 h ou à la fin de la campagne).
- [ ] **Peu de flags** : < 10–15 % des réponses ou des users concernés par un flag.
- [ ] **Pas de gel** nécessaire sur les users de cette campagne (ou 1–2 cas isolés après revue).
- [ ] **Temps pour quota** : si quota atteint, durée cohérente (heures à jours selon taille base). Voir KPI pilot (détail campagne, bloc “Résumé preuve” si terminée).

---

## 6. Go / no-go pour relancer une autre campagne

- **Go** : qualité OK, pas de chaos flags, entreprise pilote satisfaite. On peut proposer une V2 ou une nouvelle campagne (même source ou une autre). Mettre à jour le pipeline user-supply : source “Qualité OK” ou “Source à scaler” si volume à augmenter.
- **No-go** : qualité mauvaise, trop de flags, ou source à couper. Ne pas relancer une campagne sur la même base sans avoir coupé la mauvaise source ou attendu une nouvelle vague propre. Documenter dans `docs/user-sources-template.csv` (keep_or_cut, fraud_note, next_step).

---

**Références** : `docs/user-pilot-supply-plan.md`, `docs/checklist-onboard-pilot-company.md`, `docs/checklist-launch-campaign.md`, `docs/pilot-kpi-minimum-spec.md`, `docs/checklist-user-pilot-quality.md`, `docs/user-acquisition-fraud-guardrails-runbook.md`.
