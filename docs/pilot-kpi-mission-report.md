# Rapport mission — PILOT_MINIMUM_KPI_AND_REPEAT_BASELINE_01

## 1. Vérifications initiales

- **KPI doc confirmés** : `docs/pilot-kpi-minimum-spec.md` existait ; temps pour quota, coût par réponse, qualité, repeat, flags, webhooks, withdrawals y étaient décrits ou mentionnés.
- **KPI réellement calculables** : `campaigns` (quota, responses_count, cost_total_cents), `responses` (payout_status), `campaign_quality_stats` (RPC), `flags`, `withdrawals`, `webhook_events` (processing_status), `org_balances`, `org_ledger_entries` — confirmés en DB/migrations.
- **KPI non calculables proprement** : rétention J1/J7 (pas de dates premières réponses / sessions), taux de réponse après vue (pas d’impressions), relance campagne (pas d’historique status), NPS agrégé (pas de type dédié).
- **Stratégie retenue** : DB-first (RPC dans une migration), helper-first (`pilotKpis.ts` + `adminData.getAdminPilotKpis`), affichage ciblé (dashboard home, détail campagne, admin overview).

## 2. Choix retenus

- **Source de vérité KPI** : `supabase/migrations/0023_pilot_kpis.sql` (4 RPC) + `dashboard/src/lib/pilotKpis.ts` (getCampaignTimeToQuota, getOrgRepeatBaseline, getOrgPilotKpis) + `adminData.getAdminPilotKpis` (service_role).
- **Définition repeat** : `docs/repeat-enterprise-definition.md` — repeat_eligible = au moins 1 campagne terminée, repeat_positive = au moins 2 campagnes ; repeat_rate global = orgs_repeat_positive / orgs_repeat_eligible.
- **Points d’affichage** : dashboard home (cartés KPI 4–6), détail campagne (bloc « KPI pilot »), admin overview (bloc « KPI pilot (ops) »).

## 3. Fichiers créés

- `docs/repeat-enterprise-definition.md` — Définition repeat entreprise, formules, limites, évolutions.
- `supabase/migrations/0023_pilot_kpis.sql` — get_campaign_time_to_quota, get_org_repeat_baseline, get_org_pilot_kpis, get_admin_pilot_kpis.
- `dashboard/src/lib/pilotKpis.ts` — Helpers client : getCampaignTimeToQuota, getOrgRepeatBaseline, getOrgPilotKpis, formatTimeToQuota.
- `docs/pilot-kpi-mission-report.md` — Ce rapport.

## 4. Fichiers modifiés

- `dashboard/app/page.tsx` — Chargement `getOrgPilotKpis(orgId)`, affichage cartes KPI (actives, terminées, crédit, réponses, temps moyen quota, qualité moy., repeat).
- `dashboard/app/campaigns/[id]/page.tsx` — Chargement `getCampaignTimeToQuota`, état `timeToQuota` ; bloc « KPI pilot » (temps pour quota, en cours, lancée le, coût réel/réponse) ; utilisation `costTotalCents` depuis stats.
- `dashboard/src/lib/supabaseCampaigns.ts` — getCampaignStats : select `cost_total_cents`, retour `costTotalCents`.
- `dashboard/src/lib/adminData.ts` — `AdminPilotKpis`, `getAdminPilotKpis()` (RPC get_admin_pilot_kpis).
- `dashboard/app/admin/page.tsx` — Appel `getAdminPilotKpis()`, bloc « KPI pilot (ops) » (flags, webhook errors 24h/7j, retraits pending/payés 7j, repeat eligible/positive, taux repeat).
- `docs/pilot-kpi-minimum-spec.md` — Mise à jour honnête : pour chaque KPI, état (calculé, affiché, calculable non affiché, non instrumentable) et où c’est affiché.

## 5. Gates

- **Typecheck dashboard** : `npx tsc --noEmit` OK.
- **Flows** : Aucune modification des flows login/select-org, campaigns new/detail, billing, mobile ; uniquement ajouts d’appels et de blocs UI.
- **KPI seed** : Les RPC et helpers s’appuient sur les tables existantes ; un org/campaign de seed avec réponses et quota atteint affichera temps pour quota, coût/réponse, repeat selon les données.
- **Repeat** : Définition et formules figées dans `repeat-enterprise-definition.md` et RPC.
- **Non instrumentables** : Indiqués dans `pilot-kpi-minimum-spec.md` (rétention J1/J7, taux après vue, relance, NPS agrégé).

## 6. Diff résumé

- DB : 4 RPC (temps quota, repeat baseline org, KPIs org, KPIs admin).
- Dashboard : 1 nouveau module (`pilotKpis.ts`), home avec cartes KPI, détail campagne avec bloc KPI et coût/réponse, admin avec bloc KPI ops.
- Docs : repeat défini, spec KPI mise à jour, rapport mission ajouté.

## 7. Ce qui restera pour la mission suivante

- Rétention J1/J7 si besoin : vue ou table « première réponse par user » + fenêtres J1/J7.
- Relance campagne : historique des changements de statut (event ou table).
- NPS / satisfaction : agrégation si template NPS utilisé.
- Export CSV KPI campagne ou section « preuves pilot » : optionnel, non fait dans cette mission pour rester minimal.
- Écarts ledger : RPC ou job de cohérence si besoin ops.

---

**Résumé honnête** : Sont **réellement mesurés et affichés** : temps pour quota (campagne et moyenne org), coût réel par réponse, qualité campagne (et moyenne org), repeat baseline (org + global admin), flags ouverts, webhooks errors 24h/7j, retraits pending et payés 7j. **Ne sont pas mesurés** : rétention J1/J7, taux de réponse après vue, relance campagne, NPS agrégé ; tous documentés comme non instrumentables ou prochaine étape dans la spec.
