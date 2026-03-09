# Rapport mission — CAMPAIGN_DUPLICATION_AND_REPEAT_FLOW_01

## 1. Vérifications initiales

- **Duplication existante** : Oui. `duplicateCampaign` dans `dashboard/src/lib/supabaseCampaigns.ts` récupérait name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents et insérait une nouvelle campagne. **Problèmes** : (1) pas de filtre `org_id` sur la source (risque cross-org), (2) création en `status: "active"` (lancement automatique).
- **Champs duplicables confirmés** : name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents (schéma campaigns dans 0001, 0010, 0011).
- **Stratégie retenue** : Réutiliser `duplicateCampaign` en le corrigeant : (1) filtrer la source par `org_id = getCurrentOrgId()`, (2) créer la copie en `status: "paused"` (brouillon), (3) ajouter `source_campaign_id` en DB pour traçabilité repeat. Pas de pré-remplissage de campaigns/new : duplication = création serveur puis redirection vers le détail de la copie.
- **Garde-fous retenus** : Uniquement duplication même org ; jamais de statut actif sur la copie ; pas de duplication réponses/flags/ledger ; un seul flux (pas de double usine create).

## 2. Choix retenus

- **Stratégie technique** : `duplicateCampaign` fait un select source avec `.eq("org_id", orgId)`, puis insert avec status `"paused"` et `source_campaign_id: campaignId`. Redirection vers `/campaigns/${created.id}` après succès.
- **Statut initial de la copie** : `paused` (brouillon). Facturation et visibilité active uniquement après clic « Publier » par l’utilisateur.
- **Champ source_campaign_id** : Retenu. Migration `0024_campaign_source_duplication.sql` ajoute `source_campaign_id uuid null references campaigns(id) on delete set null`. Permet de distinguer à terme les campagnes créées par duplication (repeat « V2 ») sans changer le calcul actuel du repeat baseline.

## 3. Fichiers créés

- `supabase/migrations/0024_campaign_source_duplication.sql` — Colonne `source_campaign_id` + index partiel.
- `docs/campaign-duplication-repeat-runbook.md` — Runbook : quand dupliquer, ce qui est repris / pas repris, comment lancer une V2, usage commercial.
- `docs/campaign-duplication-mission-report.md` — Ce rapport.

## 4. Fichiers modifiés

- `dashboard/src/lib/supabaseCampaigns.ts` — `duplicateCampaign` : filtre `.eq("org_id", orgId)` sur le fetch source ; insert en `status: "paused"` ; suffixe nom par défaut `" — V2"` ; ajout `source_campaign_id` dans l’insert.
- `dashboard/app/campaigns/[id]/page.tsx` — Bouton principal « Dupliquer » renommé en « Créer une V2 » (avec title explicatif) ; bloc « Et ensuite ? » pour les campagnes terminées avec CTA « Créer une V2 ».
- `docs/repeat-enterprise-definition.md` — Mention de la duplication et de `source_campaign_id` ; évolution possible « repeat par duplication ».
- `docs/pilot-kpi-minimum-spec.md` — Paragraphe duplication (flow V2, copie en paused, source_campaign_id, runbook).

## 5. Migration et justification

- **Migration 0024** : Ajout de `source_campaign_id` sur `campaigns`. Justification : mesure minimale du repeat par duplication sans stack analytics ; optionnel pour les KPI actuels, utile pour évolution (ex. « X % des campagnes sont des V2 »). Aucune vue existante ni RPC modifiée ; pas de cascade sur les flows.

## 6. Gates

- **Typecheck dashboard** : `npx tsc --noEmit` OK.
- **Duplication même org** : Select source avec `.eq("org_id", orgId)` → impossible de dupliquer une campagne d’une autre org.
- **Copie jamais active automatiquement** : Insert avec `status: "paused"` ; passage en active uniquement via « Publier » (contrôles billing inchangés).
- **Flows existants** : Create campaign, détail campagne, billing/topup, export CSV, auth org, admin campaigns non modifiés dans leur logique (uniquement ajouts UI et paramètres duplicateCampaign).

## 7. Diff résumé

- **DB** : 1 colonne nullable `source_campaign_id` + index.
- **Dashboard** : duplicateCampaign sécurisé (org) et en paused, nom « — V2 », CTA « Créer une V2 », bloc « Et ensuite ? » pour campagnes terminées.
- **Docs** : runbook duplication/repeat, alignement repeat-enterprise-definition et pilot-kpi-minimum-spec.

## 8. Ce qui restera pour la mission suivante

- KPI « repeat par duplication » (part des campagnes avec `source_campaign_id` non null) si besoin.
- Pré-remplissage de `campaigns/new` via query params à partir d’une campagne (optionnel, non demandé).
- CTA « Dupliquer » depuis la liste des campagnes (optionnel, mission indiquait « si simple »).
