# Mission — Qualité campagne (vue profonde + fondation insights batch)

**Mission** : CAMPAIGN_QUALITY_DEEP_VIEW_AND_BATCH_INSIGHTS_FOUNDATION_01  
**Objectif** : Une vraie vue qualité campagne utile + fondation d’insights batch exploitables, sans IA externe, pour mieux éclairer la décision et le repeat entreprise.

---

## 1. Vérifications initiales

- **Sources qualité confirmées** : `campaign_quality_stats` (pct_valid, pct_too_fast, pct_empty), `get_campaign_quality_stats`, `get_campaign_time_to_quota`, `get_campaign_stats` (distribution, trustAvg, responsesCount, quota), flags via table `flags` liée par `response_id` aux réponses de la campagne.
- **Signaux supplémentaires calculables confirmés** : temps moyen de réponse (à partir de `responses.duration_ms` via une RPC dédiée), nombre de flags par campagne, distribution des choix déjà disponible dans stats ; signal global et observations déterministes calculables côté client à partir de ces données.
- **Limites confirmées** : pas de LLM ; pas de clustering NLP ; `duration_ms` peut être absent sur certaines réponses ; les observations sont 100 % déterministes et ne couvrent pas résumés verbatims / top objections / clusters (prévu pour plus tard).
- **Meilleur point d’affichage retenu** : enrichissement de la page détail campagne (`dashboard/app/campaigns/[id]/page.tsx`) avec une section « Qualité campagne » (métriques + signal + top choix) et un bloc « À retenir » (observations), sans refonte complète de la page.
- **Stratégie retenue** : RPC légère `get_campaign_quality_deep` pour avg_duration_ms et flags_count ; helper central `campaignQualityInsights.ts` (fetchCampaignQualityDeep + buildCampaignQualityInsights) ; affichage dans le détail campagne ; runbook de lecture qualité ; alignement des docs (KPI, repeat).

---

## 2. Choix retenus

- **Point d’affichage** : détail campagne, section « Qualité campagne » + bloc « À retenir » (3 à 5 observations).
- **Heuristiques signal** (documentées dans le helper) : **Bon** si pct_valid ≥ 75, pct_too_fast ≤ 15, flaggedRatio ≤ 0,1 ; **Faible** si pct_valid < 60 ou pct_too_fast ≥ 30 ou flaggedRatio ≥ 0,2 ; sinon **À surveiller**. Observations : remplissage rapide/lent, trop rapides, valides, flags, temps moyen court si pertinent ; sinon « pas d’anomalie détectée ».
- **Fondation batch** : helper + types `CampaignQualityDeep`, `CampaignQualityInsights`, `CampaignQualityInsightsInput` ; structure prête pour enrichissements futurs (résumé verbatims, top objections, clusters) sans LLM ni infra batch lourde.

---

## 3. Fichiers créés

| Fichier | Rôle |
|--------|------|
| `supabase/migrations/0025_campaign_quality_deep.sql` | RPC `get_campaign_quality_deep(_campaign_id)` retournant avg_duration_ms, responses_with_duration, flags_count (sécurisée org + can_manage_org). |
| `dashboard/src/lib/campaignQualityInsights.ts` | Helper : types, `fetchCampaignQualityDeep(campaignId)`, `buildCampaignQualityInsights(input)` (signal, observations, topChoices, métriques). |
| `docs/campaign-quality-reading-runbook.md` | Runbook : comment lire la qualité, signaux rassurants/inquiétants, quand V2, quand ne pas utiliser comme preuve, limites. |
| `docs/campaign-quality-mission-report.md` | Ce rapport. |

---

## 4. Fichiers modifiés

| Fichier | Modifications |
|--------|----------------|
| `dashboard/app/campaigns/[id]/page.tsx` | State `qualityDeep`, appel `fetchCampaignQualityDeep(id)` dans `loadStats` ; calcul `qualityInsights` via `buildCampaignQualityInsights` ; section « Qualité campagne » enrichie (signal, valides/trop rapide/vides, temps moyen, flags, trust moyen, top choix) ; bloc « À retenir » (observations). |
| `docs/pilot-kpi-minimum-spec.md` | Ligne Qualité campagne : ajout signal, temps moyen, flags, top choix, observations, référence runbook qualité. |
| `docs/repeat-enterprise-definition.md` | Paragraphe sur qualité campagne ↔ proof ↔ repeat et lien vers runbook qualité. |

---

## 5. Gates

- **Typecheck dashboard** : `tsc --noEmit` dans dashboard : OK. `npm run build` échoue pour une cause préexistante (page `/login` : useSearchParams sans Suspense), non liée à cette mission.
- **Lint** : ciblé sur les fichiers touchés (page détail, campaignQualityInsights).
- **Vérification manuelle** : une campagne seed/terminée avec réponses doit afficher une vue qualité cohérente (signal, métriques, observations).
- **Flows** : create campaign, detail, export CSV/JSON, billing, duplication V2, KPI existants, admin — non modifiés dans leur logique métier ; uniquement ajout de chargement qualité deep et d’affichage.
- **Observations** : 100 % déterministes, règles dans `campaignQualityInsights.ts`.
- **Docs** : pilot-kpi-minimum-spec et repeat-enterprise-definition alignés avec la qualité profonde et le runbook.

---

## 6. Diff résumé

- **Backend** : une migration ajoutant une RPC lecture seule pour qualité deep (durée moyenne, flags).
- **Front** : un helper central qualité/insights ; détail campagne enrichi (qualité + à retenir), sans changer les flows existants.
- **Docs** : runbook lecture qualité ; KPI et repeat mis à jour pour refléter la qualité profonde et le lien proof/repeat.

---

## 7. Ce qui restera pour la mission suivante

- **Insights batch avancés** : résumé verbatims, top objections, top raisons, clusters (sans promettre de l’IA si non implémenté).
- **Badge « Qualité à surveiller »** dans la liste des campagnes (home ou admin) si souhaité et si coût technique faible.
- **Éventuelles évolutions** : seuils signal configurables, export qualité dans le proof pack, indicateurs agrégés par org (qualité moyenne, part campagnes « Bon »).
