# Rapport mission — CAMPAIGN_PROOF_CAPTURE_AND_CASE_STUDY_PACK_01

## 1. Vérifications initiales

- **Sources de preuve déjà disponibles** : Page détail campagne charge `getCampaignStats` (campaign, responsesCount, quota, distribution, trustAvg, qualityBadge, verbatims, costTotalCents), `getCampaignQualityStats` (pct_valid, pct_too_fast, pct_empty), `getCampaignTimeToQuota` (time_to_quota_seconds, quota_reached). Export CSV/JSON des réponses existant. Aucune source externe.
- **Éléments de case study réellement calculables** : nom campagne, question, date (created_at), quota / réponses obtenues, temps pour quota (si quota atteint), coût réel par réponse (costTotalCents / responsesCount), qualité (pct_valid), chiffre fort dérivé (ex. « X réponses en Y », « Z % valides », « Coût X €/réponse »), résumé court synthétique.
- **Limites** : nom d’org non chargé sur la page détail (non ajouté pour rester sobre). Citation client, logo, intro = 100 % manuels ; le résumé exportable inclut une note « à compléter manuellement ».
- **Stratégie retenue** : Helper `buildCampaignProofPack` qui construit le proof pack à partir des données déjà en mémoire (stats, qualityStats, timeToQuota) — aucun appel réseau supplémentaire. Bloc « Résumé preuve » sur la page détail campagne (campagnes terminées), avec « Copier le résumé (Markdown) ». Docs : template case study + runbook citation/logo/intro ; alignement pilot-evidence-matrix et demo-script.

## 2. Choix retenus

- **Point d’entrée** : Page détail campagne (`dashboard/app/campaigns/[id]/page.tsx`). Bloc « Résumé preuve » affiché uniquement pour les campagnes **terminées** (status === "completed").
- **Format export** : **Markdown** copiable dans le presse-papiers via bouton « Copier le résumé (Markdown) ». Pas de PDF ni d’export fichier supplémentaire.
- **Limites** : Chiffre fort calculé de façon honnête (priorité : temps pour quota, puis % valides, puis coût/réponse). Badge « Bonne preuve potentielle » affiché si campagne terminée, quota atteint, qualité ≥ 70 % (ou non dispo) et au moins une métrique forte (temps ou qualité). Citation / logo / intro non automatisés, documentés dans le runbook.

## 3. Fichiers créés

- `dashboard/src/lib/campaignProof.ts` — `CampaignProofInput`, `CampaignProofPack`, `buildCampaignProofPack`, `proofPackToMarkdown` ; logique chiffre fort et résumé court.
- `docs/case-study-template.md` — Template mini case study (problème, campagne lancée, résultats, décision prise ; citation, logo, intro à compléter).
- `docs/proof-capture-and-client-reference-runbook.md` — Runbook : quand transformer en preuve, captures, choix du chiffre fort, demande citation / logo / intro, ce qu’il ne faut pas promettre.
- `docs/campaign-proof-mission-report.md` — Ce rapport.

## 4. Fichiers modifiés

- `dashboard/app/campaigns/[id]/page.tsx` — Import `buildCampaignProofPack`, `proofPackToMarkdown` ; état `proofCopyToast` ; calcul `proofPack` pour campagnes terminées ; bloc « Résumé preuve » (résumé, chiffre fort, badge « Bonne preuve potentielle » si pertinent, bouton « Copier le résumé (Markdown) ») ; toast « Résumé preuve copié ».
- `docs/pilot-evidence-matrix.md` — Ligne « Preuve campagne / case study » dans le tableau ; paragraphe « Preuve commerciale » avec liens vers case-study-template et runbook.
- `docs/demo-script-10min.md` — Optionnel en conclusion : montrer Résumé preuve + Copier le résumé ; renvoi vers runbook et template.

## 5. Gates

- **Typecheck dashboard** : `npx tsc --noEmit` OK.
- **Lint** : Aucune erreur sur les fichiers touchés.
- **Proof pack cohérent** : Pour une campagne seed terminée (quota atteint, qualité et temps pour quota disponibles), le proof pack affiche volume, rapidité, qualité, coût, chiffre fort et le résumé copié en Markdown est cohérent.
- **Flows existants** : Create campaign, détail campagne, export CSV/JSON, billing, auth, admin non modifiés dans leur logique (ajout d’un bloc et d’un bouton uniquement).
- **Docs** : case-study-template et proof-capture runbook alignés avec le produit (Résumé preuve, Copier le résumé, détail campagne).

## 6. Diff résumé

- **Nouveau module** : `campaignProof.ts` (build proof pack from existing data, export Markdown).
- **Détail campagne** : bloc « Résumé preuve » pour campagnes terminées, badge « Bonne preuve potentielle » si critères remplis, bouton « Copier le résumé (Markdown) ».
- **Docs** : template case study (problème / campagne / résultats / décision + citation, logo, intro), runbook capture et référence client, mise à jour matrice preuves et script démo.

## 7. Ce qui est calculé automatiquement vs manuel

- **Automatique** : nom campagne, question, date, statut, quota, réponses obtenues, temps pour quota (si disponible), coût réel/réponse (si disponible), qualité % valides, chiffre fort (priorité temps → qualité → coût), résumé court, candidature « bonne preuve » (quota + qualité correcte + au moins une métrique).
- **Manuel** : citation client, autorisation logo, intro vers une autre boîte, complément contexte (problème, décision prise) pour le case study — décrit dans `case-study-template.md` et `proof-capture-and-client-reference-runbook.md`.

## 8. Ce qui restera pour la mission suivante

- Nom d’org dans le proof pack (si besoin, via appel léger ou contexte existant).
- Export proof pack en fichier .md téléchargeable (optionnel).
- Aucune IA, aucun PDF généré, aucun CRM ni mailing ajouté.
