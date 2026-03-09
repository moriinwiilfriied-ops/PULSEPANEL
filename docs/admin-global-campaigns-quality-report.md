# Mission ADMIN_GLOBAL_CAMPAIGNS_AND_QUALITY_01 — Rapport final

## 1. Vérifications initiales

- **Chemins confirmés**
  - `dashboard/app/campaigns/[id]/page.tsx` (détail campagne org), `dashboard/app/campaigns/new/page.tsx`, `dashboard/app/page.tsx` (liste campagnes org)
  - `dashboard/src/lib/supabaseCampaigns.ts` : getCampaigns (org), getCampaignStats, getCampaignQualityStats (RPC), updateCampaignStatus, duplicateCampaign, exportCampaignResponses
  - `dashboard/src/lib/adminData.ts` : getAdminOverviewStats avec campaignsActiveCount (count active)
  - `dashboard/app/admin/layout.tsx` : NAV sans /admin/campaigns avant cette mission
  - `supabase/migrations/0001_init.sql` (campaigns), 0002_orgs (org_id, RLS), 0003_campaign_progress (status active|paused|completed, responses_count), 0010 (template_key, template_version), 0011 (cost_*, billing_status), 0006 (campaign_quality_stats, get_campaign_quality_stats)

- **Sources campagnes confirmées**
  - Table `campaigns` : id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, cost_per_response_cents, cost_total_cents, status, billing_status, created_at, responses_count.
  - Dashboard org : getCampaigns() filtre par org_id (getCurrentOrgId), RLS campaigns_select_active_or_member / campaigns_update_member.

- **Actions de statut existantes confirmées**
  - `updateCampaignStatus(campaignId, status)` dans supabaseCampaigns : `supabase.from("campaigns").update({ status }).eq("id", campaignId)`. Utilise le client utilisateur (RLS) → réservé aux membres de l’org. Aucune API admin pour modifier le statut d’une campagne quelconque avant cette mission.

- **Source qualité campagne confirmée**
  - Vue `campaign_quality_stats` (0006) : campaign_id, total_responses, valid_responses, invalid_responses, pct_valid, pct_too_fast, pct_empty (à partir de responses + flags).
  - RPC `get_campaign_quality_stats(_campaign_id)` : vérifie can_manage_org(campaign_org), retourne une ligne de la vue. Donc utilisable uniquement par un membre de l’org. Pour l’admin global : lecture directe de la vue via supabaseAdmin (bypass RLS).

- **Limites confirmées**
  - Pas de page /admin/campaigns avant cette mission.
  - Pas d’updated_at / end_at sur campaigns.
  - Export CSV/JSON : RPC export_campaign_responses, scoped org (can_manage_org). L’admin ne peut pas appeler cette RPC « en tant qu’org » ; lien vers dashboard org laissé pour l’export.

---

## 2. Choix retenus

- **Source de vérité campagnes**
  - Table `campaigns` en lecture via **supabaseAdmin** pour la liste et le détail admin (cross-org). Aucune modification des RPC ou policies existantes pour le dashboard org.

- **Source de vérité qualité**
  - Vue **campaign_quality_stats** lue via supabaseAdmin pour l’admin (getAdminCampaigns merge qualité par campaign_id, getAdminCampaignDetail + getAdminCampaignQuality). Pas d’utilisation de get_campaign_quality_stats (RPC org-scoped) côté admin.

- **Stratégie actions admin retenue**
  - Nouvelle route **POST /api/admin/campaigns/[id]/status** (body `{ status: "active" | "paused" | "completed" }`), protégée par getAdminSession(), qui fait un `supabaseAdmin.from("campaigns").update({ status }).eq("id", campaignId)`. Réutilisation de la même logique métier que updateCampaignStatus (mise à jour du statut uniquement) ; les triggers existants (bill_campaign_on_activate, fill_campaign_costs) restent inchangés.

---

## 3. Fichiers créés

- `dashboard/app/admin/campaigns/page.tsx` — liste campagnes cross-org, KPIs, filtres (status, search), tableau avec lien détail
- `dashboard/app/admin/campaigns/[id]/page.tsx` — détail campagne (id, org, statut, template, question, quota, responses, coûts, qualité, flags count, liens)
- `dashboard/app/admin/campaigns/[id]/CampaignStatusActions.tsx` — client : Pause / Reprendre / Terminer avec confirmation
- `dashboard/app/api/admin/campaigns/[id]/status/route.ts` — POST status (active | paused | completed)
- `docs/admin-campaigns-runbook.md` — runbook admin campagnes
- `docs/admin-global-campaigns-quality-report.md` — ce rapport

---

## 4. Fichiers modifiés

- `dashboard/src/lib/adminData.ts` — ajout AdminCampaignRow, AdminCampaignsFilters, getAdminCampaigns(filters), AdminCampaignDetail, getAdminCampaignDetail(id), getAdminCampaignQuality(campaignId), AdminCampaignStats, getAdminCampaignStats()
- `dashboard/app/admin/layout.tsx` — ajout lien « Campaigns » dans NAV vers /admin/campaigns

---

## 5. Migration éventuelle et justification

- Aucune migration. Utilisation exclusive des tables et vues existantes (campaigns, orgs, campaign_quality_stats, responses, flags).

---

## 6. Sources de vérité utilisées

- **Campagnes** : table `campaigns` (lecture/écriture status via admin API).
- **Qualité** : vue `campaign_quality_stats` (lecture seule admin).
- **Orgs** : table `orgs` (nom pour affichage).
- **Flags** : comptage via `flags` + `responses` pour nombre de flags par campagne.

---

## 7. Gates

- **Typecheck dashboard** : OK.
- **Lint** (fichiers touchés) : aucune erreur.
- **Admin voit campagnes cross-org** : liste /admin/campaigns alimentée par getAdminCampaigns() (supabaseAdmin, pas de filtre org).
- **Action admin status** : POST /api/admin/campaigns/[id]/status met à jour campaigns.status ; le dashboard org continue d’utiliser getCampaigns() et updateCampaignStatus() pour ses propres campagnes (RLS), pas de conflit.
- **Qualité** : affichée depuis la vue campaign_quality_stats (getAdminCampaignDetail / getAdminCampaigns).

---

## 8. Diff résumé

- **adminData** : nouveaux types et fonctions pour campagnes admin (liste, détail, qualité, KPIs).
- **Admin** : nouvelle page liste /admin/campaigns (KPIs, filtres, tableau), nouvelle page détail /admin/campaigns/[id] (détail, qualité, flags count, actions Pause/Reprendre/Terminer, lien dashboard org).
- **API** : nouvelle route POST /api/admin/campaigns/[id]/status.
- **Layout** : lien Campaigns dans la nav admin.

---

## 9. Ce qui restera pour la mission suivante

- **Remboursement** : aucune logique remboursement campagne implémentée ; à traiter manuellement ou en mission dédiée.
- **Export admin** : pas d’export CSV/JSON direct depuis l’admin (RPC export_campaign_responses scoped org). L’admin pointe vers le dashboard org pour l’export.
- **Notes admin campagne** : pas de table ni champ dédié ; à prévoir en mission dédiée si besoin.
- **Quality warning KPI** : getAdminCampaignStats expose withFlagsCount (campagnes ayant au moins un flag) ; un indicateur « quality warning » plus fin (ex. pct_too_fast > seuil) pourrait être ajouté plus tard sans changer la source de vérité.
