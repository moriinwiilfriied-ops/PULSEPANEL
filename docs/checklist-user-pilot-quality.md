# Checklist — Qualité user pilot

À utiliser pour évaluer et décider sur les sources de recrutement : garder, surveiller ou couper.

---

## 1. Source de recrutement

- [ ] **Source identifiée** et tracée (nom, type : Discord / Reel / micro-influenceur / etc.).
- [ ] **Date de lancement** du contenu / message notée.
- [ ] **Lien ou code** de traçabilité si possible (UTM, lien dédié, ou note “source X” dans le suivi).

---

## 2. Volume amené

- [ ] **Nombre estimé** d’inscriptions ou de premiers opens liés à cette source (estimation ou métrique si disponible).
- [ ] **Nombre de users** ayant répondu au moins une fois (actual_users dans le pipeline).
- [ ] **Cohérence** : volume attendu vs volume réel (surestimation = normal ; sous-estimation = vérifier le canal).

---

## 3. Qualité observée

- [ ] **Taux de réponses valides** (vs too_fast / empty) sur les campagnes où cette cohorte a répondu. Consulter Admin → Campaigns → qualité (pct_valid, pct_too_fast, pct_empty) ou détail campagne.
- [ ] **Comportement** : pas de rafale de réponses en 1 min ; pas de retraits en masse le jour J.
- [ ] **Trust** : pas de dégradation massive du trust_level des users de cette source (Admin → Users si visible).

---

## 4. Signaux de fraude

- [ ] **Flags** : nombre de flags ouverts sur les users de cette source. Si > 10–15 % des users flaggés ou plusieurs flags par user → signal d’alerte.
- [ ] **Devices partagés** : Admin → User → section Devices. Si beaucoup de “partage device avec X autres comptes” sur la cohorte → signal. Voir `docs/user-devices-risk-runbook.md`.
- [ ] **Daily limits** : users qui touchent systématiquement les plafonds (réponses/jour, gains/jour) sans comportement “normal” → à surveiller. Voir `docs/daily-limits-and-server-guards-runbook.md`.
- [ ] **Retraits** : demandes anormalement élevées ou montants suspects. Voir `docs/flags-and-withdrawal-freeze-runbook.md`.

---

## 5. Signaux de confusion produit

- [ ] **Support** : beaucoup de questions “où est mon argent”, “pourquoi pending”, “quand je peux retirer” → améliorer le message d’acquisition ou les hints dans l’app (wallet, pending/available).
- [ ] **Abandons** : inscription sans aucune réponse → message ou onboarding à revoir (hors scope qualité source, mais à noter).

---

## 6. Trust / retraits / flags à surveiller

- [ ] **Admin → Flags** : filtrer ou noter les users par source si tracé ; compter les flags par cohorte.
- [ ] **Admin → Withdrawals** : volume de demandes en pending / payées / rejetées pour la cohorte.
- [ ] **Admin → Users** : trust_level, withdrawals_frozen, nombre de devices. Coupler avec `docs/user-devices-risk-runbook.md` et `docs/flags-and-withdrawal-freeze-runbook.md`.

---

## 7. Quand couper une source

- [ ] **Taux de flags** très élevé sur la cohorte (> 20–25 % des users avec au moins un flag, ou > 15 % de réponses invalides sur les campagnes concernées).
- [ ] **Multi-compte / devices** : pattern clair de partage de device entre nombreux comptes liés à cette source.
- [ ] **Gels nécessaires** : plusieurs users de cette source ont dû être gelés (retraits) après revue.
- [ ] **Rapport qualité/volume** : le coût (temps support, risque fraude) dépasse le bénéfice (réponses utiles).

**Action** : Marquer la source comme “Source coupée” dans le pipeline ; ne plus diffuser de nouveau contenu ; ne pas supprimer les users existants mais les surveiller comme le reste.

---

## 8. Quand augmenter une source

- [ ] **Qualité OK** : peu de flags, peu de too_fast/empty, pas de gel nécessaire.
- [ ] **Volume utile** : les users répondent de façon régulière et exploitable.
- [ ] **Pas de signaux fraude** : pas de partage device suspect, pas de retraits anormaux.
- [ ] **Besoin de supply** : objectif 200–500 users pas encore atteint, et cette source est fiable.

**Action** : Marquer “Source à scaler” ; prévoir un prochain contenu ou partenariat sur ce canal ; ne pas multiplier les posts sans revoir la qualité après chaque vague.

---

**Références** : `docs/user-supply-pipeline-minimum.md`, `docs/user-acquisition-fraud-guardrails-runbook.md`, `docs/user-sources-template.csv`.
