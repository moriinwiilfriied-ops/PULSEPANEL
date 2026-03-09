# Segmentation des sources user — Pilot PulsePanel

Sources P1 / P2 / P3, avantages, risques, contrôle qualité, volume probable et cas d’usage adaptés.

---

## 1. Sources P1 (priorité haute)

| Source | Avantages | Risques | Contrôle qualité | Volume probable | Cas d’usage |
|--------|-----------|---------|------------------|-----------------|-------------|
| **Petites communautés (Discord, groupes FB ciblés)** | Audience qualifiée, message maîtrisé, accord admin possible. | Petit volume par source. | Surveiller flags, too_fast, devices. Tracer la source. | 20–80 par communauté | Tests A/B, prix, slogan ; réponses sérieuses. |
| **Micro-influenceurs (1–10 K)** | Crédibilité, message authentique, volume maîtrisé. | Dépendance au partenaire ; brief obligatoire. | Idem. Vérifier qualité 48 h après post. | 30–100 par partenaire | Campagnes courtes, quota 50–100. |
| **Étudiants (groupes écoles, associations)** | Réactifs, besoin micro-revenus, disponible. | Risque réponses trop rapides ; multi-compte possible. | Daily limits actives ; surveiller trust_level, flags. | 50–200 selon canal | Tests rapides, NPS, concept. |

---

## 2. Sources P2 (priorité moyenne)

| Source | Avantages | Risques | Contrôle qualité | Volume probable | Cas d’usage |
|--------|-----------|---------|------------------|-----------------|-------------|
| **TikTok / Reels organiques** | Gratuit, viralité possible, jeune. | Volume et qualité imprévisibles ; message peut dériver. | Tracer via lien UTM ou landing ; surveiller qualité par cohorte. | 50–150 par vidéo si ça prend | Campagnes simples, quota 80–150. |
| **Forums / communautés niche (hors Discord)** | Ciblage précis. | Parfois sceptiques ; modération variable. | Message honnête ; pas de promesse de gains. | 20–60 par post | Tests spécialisés si la niche matche. |

---

## 3. Sources P3 (à tester avec prudence)

| Source | Avantages | Risques | Contrôle qualité | Volume probable | Cas d’usage |
|--------|-----------|---------|------------------|-----------------|-------------|
| **Stories / posts organiques sans influenceur** | Contrôle total du message. | Portée limitée. | Idem P1/P2. | 20–80 | Complément. |
| **Partenariats écoles / jobs étudiants** | Volume potentiel. | Process plus long ; cadre à définir. | Accord clair, traçabilité source. | Variable | Si process qualité validé. |

---

## 4. Risque fraude / multi-compte par type

- **Étudiants** : risque moyen (plusieurs comptes pour “maximiser”). Mitigation : daily limits, message clair “un compte par personne”, surveillance devices.
- **Micro-influenceurs** : risque faible à moyen (audience peut créer plusieurs comptes). Mitigation : brief “un compte par personne”, quota par campagne raisonnable.
- **Communautés** : risque variable (selon modération). Mitigation : message honnête, pas de “gagnez 100 € en 1 h”.
- **TikTok / Reels** : risque moyen (audience large, moins qualifiée). Mitigation : ne pas promettre de gains ; surveiller les 7 premiers jours.
- **Gros giveaways / ads massives** : risque élevé. À éviter au début.

---

## 5. Niveau de contrôle qualité attendu

- **Toute source** : tracer la source (lien, code, ou note dans le suivi). Consulter Admin → Users / Flags / Withdrawals pour les cohortes récentes.
- **Signaux à regarder** : flags (too_fast, empty), partage de device (Admin → User → Devices), daily limits touchées de façon anormale, retraits en rafale. Voir `docs/user-acquisition-fraud-guardrails-runbook.md`.
- **Couper une source** : si taux de flags ou de comportement suspect dépasse un seuil acceptable (ex. > 15–20 % de réponses flaggées sur une cohorte, ou plusieurs gels nécessaires). Voir `docs/checklist-user-pilot-quality.md`.

---

## 6. Cas d’usage adaptés par source

- **Communautés / Discord** : campagnes avec question claire, 2–4 options, quota 50–100. Bon pour A/B, slogan, concept.
- **Micro-influenceurs** : idem ; éviter les campagnes trop longues ou techniques.
- **Étudiants** : NPS rapide, tests prix courts, concept. Surveiller la qualité des réponses (trop rapide = inutile).
- **TikTok / Reels** : campagnes simples, visuelles, quota 80–150. Message court dans la vidéo.

---

**Références** : `docs/user-pilot-supply-plan.md`, `docs/user-recruitment-templates.md`, `docs/checklist-user-pilot-quality.md`, `docs/user-devices-risk-runbook.md`, `docs/flags-and-withdrawal-freeze-runbook.md`.
