# KPI minimums pilot — Spécification

Cadre minimum des indicateurs pour le pilot. Source de vérité : DB (vues/RPC) + helpers dashboard, pas de stack analytics externe.

---

## Légende état

- **Calculé maintenant** : disponible via RPC/vue/helper.
- **Affiché maintenant** : visible dashboard entreprise et/ou admin.
- **Calculable mais non affiché** : donnée disponible, pas encore exposée en UI.
- **Non instrumentable aujourd'hui** : pas de donnée fiable sans instrumentation supplémentaire.
- **Prochaine étape** : action pour rendre calculable ou afficher.

---

## Côté entreprise

| KPI | Description | État | Où / remarque |
|-----|-------------|------|----------------|
| Temps pour atteindre quota | Délai entre création campagne et quota atteint (réponse N° quota) | **Calculé** + **Affiché** | RPC `get_campaign_time_to_quota` ; dashboard home (moyenne), détail campagne (bloc KPI pilot) |
| Coût réel par réponse | Dépense campagne / nombre de réponses | **Calculé** + **Affiché** | `campaigns.cost_total_cents` + `responses_count` ; détail campagne « Coût réel / réponse » |
| Qualité campagne | % valides, too_fast, empty ; signal Bon/À surveiller/Faible ; temps moyen, flags, top choix, observations | **Calculé** + **Affiché** | RPC `get_campaign_quality_stats` + `get_campaign_quality_deep` ; helper `campaignQualityInsights` ; détail campagne « Qualité campagne » + « À retenir » ; dashboard home qualité moyenne. Runbook : `docs/campaign-quality-reading-runbook.md`. |
| Statut remplissage campagne | Progression quota (réponses / quota) | **Calculé** + **Affiché** | Déjà : détail campagne, liste campagnes home |
| Repeat entreprise | Orgs avec ≥ 2 campagnes ; taux repeat global | **Calculé** + **Affiché** | RPC `get_org_repeat_baseline`, `get_admin_pilot_kpis` ; home « X campagnes, Y après la première » ; admin repeat_rate, orgs_repeat_eligible/positive |
| Satisfaction / NPS | NPS ou score si campagnes NPS | **Non instrumentable** | Pas de type « NPS » agrégé dédié ; réponses brutes existent. Prochaine étape : agrégation si template NPS utilisé. |
| Taux de relance campagne | Réactivations paused → active | **Non instrumentable** | Pas d’historique des changements de statut. Prochaine étape : event ou table d’historique status. |

---

## Côté user (participant)

| KPI | Description | État | Où / remarque |
|-----|-------------|------|----------------|
| Réponses par user / session | Nb réponses par user ou par session | **Calculable mais non affiché** | Count par user_id sur `responses` ; pas de notion de « session » sans tracking. Prochaine étape : bloc admin/users ou dashboard si besoin. |
| Pending → available | Part des réponses passées en available | **Calculable** | `responses.payout_status` ; détail campagne affiche pending/available. Agrégation globale non affichée. |
| Taux cashout / demandes retrait | Withdrawals paid, pending, rejected | **Calculé** + **Affiché** | Admin : withdrawals, `get_admin_pilot_kpis` (withdrawals_pending, withdrawals_paid_7d). Côté user : pas de vue agrégée « taux » dédiée. |
| Fraude / suspicion | Flags, too_fast, empty | **Calculé** + **Affiché** | Admin Flags ; `campaign_quality_stats` (pct_too_fast, pct_empty) en détail campagne ; admin KPI pilot (flags_open). |
| Rétention J1 / J7 | Users actifs à J1 et J7 après première réponse | **Non instrumentable** | Pas de dates « première réponse » par user ni d’événements sessions. Prochaine étape : vue ou table dérivée premières réponses + fenêtre J1/J7. |
| Taux de réponse après swipe | Réponses / vues ou ouvertures | **Non instrumentable** | Impressions ou ouvertures non tracées. |

---

## Côté ops

| KPI | Description | État | Où / remarque |
|-----|-------------|------|----------------|
| Flags ouverts / récents | Nb flags open | **Calculé** + **Affiché** | RPC `get_admin_pilot_kpis` (flags_open) ; admin overview + bloc KPI pilot ops. |
| Incidents critiques | Incidents support / gel / litiges | **Approximation documentée** | Pas de table `incidents`. Approximation : flags ouverts + webhook errors + retraits pending (usage qualitatif). Documenté ici. |
| Webhooks error / ignored / processed | Par statut et période | **Calculé** + **Affiché** | RPC `get_admin_pilot_kpis` (webhook_errors_24h, webhook_errors_7d) ; admin bloc KPI pilot. Détail par event dans Admin Webhooks. |
| Écarts ledger | Cohérence org_ledger vs org_balances | **Calculable mais non affiché** | Runbook / RPC list_org_ledger existants ; pas de KPI « écart » automatique dans l’UI. Prochaine étape : RPC ou job de cohérence si besoin. |
| Retraits pending / rejected / paid | Volumétrie par statut | **Calculé** + **Affiché** | Admin withdrawals ; `get_admin_pilot_kpis` (withdrawals_pending, withdrawals_paid_7d). |

---

## Synthèse

- **Source de vérité KPI** : `supabase/migrations/0023_pilot_kpis.sql` (RPC) + `dashboard/src/lib/pilotKpis.ts` (helpers).
- **Affichage** : dashboard home (4–6 cartes), détail campagne (bloc KPI pilot), admin overview (bloc KPI pilot ops).
- **Repeat entreprise** : défini dans `docs/repeat-enterprise-definition.md` ; formules et limites explicites.
- **Duplication campagne** : flow « Créer une V2 » depuis le détail campagne ; copie en **paused** (brouillon), pas de lancement auto. Champ `campaigns.source_campaign_id` renseigné sur la copie ; permet à terme de mesurer le repeat « par duplication » (non exposé en KPI pour l’instant). Runbook : `docs/campaign-duplication-repeat-runbook.md`.
- **Non instrumenté sans évolution** : rétention J1/J7, taux de réponse après vue, relance campagne, NPS agrégé ; à traiter en mission suivante si besoin.
- **Exécution pilot business** : KPI utilisés dans le suivi post-campagne et la capture de preuve ; voir `docs/checklist-post-campaign-proof-repeat.md`, `docs/lead-to-repeat-runbook.md`.
- **Acquisition user pilot** : qualité des réponses (pct_valid, flags) et supply user sont reliés ; voir `docs/user-pilot-supply-plan.md`, `docs/checklist-source-to-first-campaign.md`, `docs/user-acquisition-fraud-guardrails-runbook.md`.
