# Runbook — Lecture qualité campagne

Comment lire la qualité d’une campagne dans PulsePanel, quels signaux sont rassurants ou inquiétants, quand relancer une V2, et quand ne pas utiliser une campagne comme preuve client.

---

## 1. Où lire la qualité

- **Détail campagne** : section « Qualité campagne » (signal Bon / À surveiller / Faible), métriques (valides, trop rapide, vides, temps moyen, flags), top choix, et bloc « À retenir » (observations déterministes).
- Les métriques viennent de la vue `campaign_quality_stats`, de la RPC `get_campaign_quality_deep` (temps moyen, flags), et du helper `campaignQualityInsights` (signal + observations). Aucune IA externe.

---

## 2. Signaux rassurants

- **Signal « Bon »** : ≥ 75 % de réponses valides, ≤ 15 % trop rapides, ≤ 10 % de réponses flaggées.
- **Peu de réponses trop rapides** (≤ 10 %) : collecte généralement plus réfléchie.
- **Taux de réponses valides élevé** (≥ 80 %) : qualité perçue stable.
- **Temps moyen de réponse** raisonnable (plusieurs secondes) et cohérent avec le type de question.
- **Peu ou pas de flags** : moins de revue manuelle nécessaire.

---

## 3. Signaux à surveiller ou inquiétants

- **Signal « À surveiller »** : entre les seuils « Bon » et « Faible » ; mérite un coup d’œil (répartition des choix, flags, verbatims).
- **Signal « Faible »** : < 60 % valides, ou ≥ 30 % trop rapides, ou ≥ 20 % flaggées — ne pas utiliser tel quel comme preuve client sans revue.
- **Taux trop rapides élevé** (≥ 20 %) : risque de clics non réfléchis ou de trafic non qualifié.
- **Temps moyen très court** (< 3 s) + beaucoup de trop rapides : renforce le doute.
- **Nombre de flags élevé** ou part flaggée ≥ 15 % : revue admin recommandée avant d’exploiter les résultats.

---

## 4. Quand relancer une V2

- Qualité **Faible** ou **À surveiller** avec doutes sur la source des répondants : ajuster ciblage, question ou quota puis relancer (duplication « Créer une V2 »).
- Résultats **Bon** mais besoin de plus de volume ou de variante : duplication adaptée puis relance.
- Ne pas relancer une V2 à l’identique si la première est clairement faible sans corriger (source, formulation, durée minimale).

---

## 5. Quand ne pas utiliser une campagne comme preuve client

- **Signal Faible** : ne pas citer comme case study / proof pack sans revue et sans mention des limites.
- **Taux de réponses flaggées élevé** non traité : attendre la revue admin ou exclure les réponses concernées avant de communiquer.
- **Données incohérentes** (ex. verbatims vides alors que question ouverte) : vérifier l’export et la configuration avant de promettre des preuves.

---

## 6. Limites connues

- **Temps moyen** : calculé sur les réponses ayant une `duration_ms` ; peut être absent si non enregistré.
- **Flags** : dépendent du workflow admin (création, résolution) ; le ratio reflète l’état actuel, pas un scoring automatique.
- **Observations « À retenir »** : 100 % déterministes (règles documentées dans `campaignQualityInsights.ts`), pas d’IA ; elles ne couvrent pas tous les cas (ex. clusters, résumés verbatims).
- **Distribution / top choix** : issue des réponses agrégées ; pour questions à choix multiples, un même répondant peut compter dans plusieurs choix.

---

## 7. Références

- Helper qualité / insights : `dashboard/src/lib/campaignQualityInsights.ts`.
- RPC qualité deep : `supabase/migrations/0025_campaign_quality_deep.sql`.
- KPI pilot : `docs/pilot-kpi-minimum-spec.md`.
- Proof / repeat : `docs/repeat-enterprise-definition.md`, `docs/checklist-post-campaign-proof-repeat.md`.
