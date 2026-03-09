# Pipeline user-supply — Minimum

Statuts simples pour suivre les sources de recrutement user à la main. Chaque statut a une définition, un next step, un signal de succès et un signal d’arrêt.

---

| Statut | Définition | Next step | Signal succès | Signal arrêt |
|--------|------------|-----------|----------------|--------------|
| **Source identifiée** | Canal repéré (Discord, Reel, micro-influenceur, etc.) et jugé pertinent. | Préparer contenu / message, contacter si besoin (admin, influenceur). | Liste de 2–5 sources P1/P2. | — |
| **Test contenu lancé** | Message ou contenu publié (post, Reel, DM envoyé). | Attendre 48–72 h, noter les premiers inscrits. | Premiers users avec source tracée. | Aucune inscription après 5–7 j. |
| **Premiers users arrivés** | Au moins 10–20 users (ou seuil défini) rattachés à cette source. | Lancer ou attendre une campagne ; observer les réponses. | Réponses enregistrées, peu d’erreurs. | Trop de signaux fraude dès l’inscription. |
| **Qualité OK** | Après 7–14 j : peu de flags, peu de too_fast/empty, pas de gel nécessaire. | Garder la source, envisager de scaler. | Taux flags < 10–15 %, qualité campagne correcte. | Taux flags élevé ou plusieurs gels. |
| **Source à surveiller** | Qualité limite ou signaux (devices, retraits) à garder à l’œil. | Ne pas scaler ; surveiller 7 j de plus. | Qualité se stabilise. | Dégradation → couper. |
| **Source coupée** | Décision de ne plus recruter via ce canal (qualité ou fraude). | Ne plus poster ; noter la raison ; garder les users existants sous surveillance. | — | — |
| **Source à scaler** | Qualité validée ; on peut augmenter le volume sur ce canal. | Planifier prochain contenu / partenaire ; relancer. | Nouveau volume propre. | Qualité se dégrade sur la nouvelle vague. |

---

## Règles d’usage

- **Une source = une ligne** (ex. dans `docs/user-sources-template.csv` ou outil externe).
- **Mettre à jour le statut** dès que la situation change (qualité mesurée, décision couper/scaler).
- **Signaux** : s’appuyer sur Admin (Flags, Users, Withdrawals, qualité campagnes) et sur `docs/checklist-user-pilot-quality.md`, `docs/user-acquisition-fraud-guardrails-runbook.md`.

---

**Références** : `docs/user-sources-template.csv`, `docs/user-pilot-supply-plan.md`, `docs/user-source-segmentation.md`, `docs/checklist-source-to-first-campaign.md`.
