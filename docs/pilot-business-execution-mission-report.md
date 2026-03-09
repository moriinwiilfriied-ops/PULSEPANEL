# Rapport mission — PILOT_BUSINESS_EXECUTION_PACK_01

## 1. Vérifications initiales

- **Docs déjà présentes confirmées** : pilot-seed-dataset, pilot-seed-quickstart, demo-script-10min, pilot-critical-scenarios, pilot-evidence-matrix, case-study-template, proof-capture-and-client-reference-runbook, repeat-enterprise-definition, pilot-kpi-minimum-spec, checklists (launch-campaign, review-withdrawal, support-incident). Toutes référencées et réutilisées.
- **Matériaux business / pricing confirmés** : pas de grille tarifaire publique dans le repo ; cas d’usage (packaging, prix, slogan, concept, NPS) et types de campagnes déjà décrits dans pilot-seed-dataset et pilot-critical-scenarios. Aucun prix fixe (199, 499, etc.) imposé par le code ou les docs existantes.
- **Trous business restants confirmés** : pas d’offre pilot formalisée, pas d’ICP/segmentation, pas de pipeline, pas de templates outreach/closing, pas de checklists onboarding/post-campaign dédiées, pas de base prospects, pas de runbook lead-to-repeat. Scripts existants : pilot-smoke, pilot-seed, pilot-reset, bootstrap (pas de script « pack business »).
- **Stratégie retenue** : tout en `docs/` (pas de CRM, pas d’intégration). Offre, ICP, pipeline, templates, checklists, template CSV prospects, runbook lead-to-repeat créés. Un script PowerShell léger (`pilot-business-pack.ps1`) pour initialiser un dossier local et copier le template prospects. Alignement des docs existantes par ajout de liens vers le pack business.

## 2. Choix retenus

- **Structure de l’offre** : une page (pour qui, problème, promesse, contenu pilot, livrable client, limites, prix conseillé, CTA). Cohérent avec petites marques / e-commerce / agences, cas packaging / prix / slogan / concept. Prix indiqué comme « 299–499 € HT » ou crédit consommable, à adapter.
- **ICP retenu** : primaire = TPE/PME/startup B2C, e-commerce/DTC ; secondaire = agences, marketplace/Amazon/Shopify. Verticales, rôles, cas d’usage vendeurs, signaux bon/mauvais prospect, priorité P1/P2/P3.
- **Pipeline retenu** : 11 statuts (Lead identifié → Message envoyé → Réponse reçue → Call booké → Démo faite → Pilot proposé → Pilot signé → Campagne lancée → Proof capturée → Repeat demandé → Intro demandée). Pour chaque statut : définition, next step, preuve attendue. Exploitable à la main avec le CSV prospects.
- **Limites assumées** : pas de CRM logiciel, pas d’intégration email/LinkedIn, pas de page marketing publique. Templates et runbook supposent exécution manuelle. Aucune modification du produit (dashboard, admin, billing, etc.).

## 3. Fichiers créés

- `docs/pilot-offer-one-pager.md` — Offre pilot canonique (1 page).
- `docs/pilot-icp-and-segmentation.md` — ICP primaire/secondaire, verticales, rôles, cas d’usage, signaux, priorité.
- `docs/pilot-pipeline-minimum.md` — Pipeline 11 statuts avec définition, next step, preuve.
- `docs/outreach-templates-pilot.md` — DM LinkedIn, email froid, relances 1 et 2, script call 15 min, script démo 20 min, script closing.
- `docs/checklist-onboard-pilot-company.md` — Checklist onboarding (compte, org, campagne, budget, cas d’usage, quota, date, contact, preuve/KPI).
- `docs/checklist-post-campaign-proof-repeat.md` — Checklist post-campagne (KPI, proof pack, case study, citation, logo, intro, V2, relance).
- `docs/pilot-prospects-template.csv` — Template prospects (colonnes company, website, contact_name, role, linkedin, email, vertical, test_angle, status, next_step, owner, notes, last_contact_at) avec 3 lignes EXEMPLE.
- `docs/lead-to-repeat-runbook.md` — Runbook du lead au repeat (qualifier, proposer pilot, onboarder, lancer campagne, lire résultat, demander preuve/citation, pousser V2, demander intro).
- `scripts/pilot-business-pack.ps1` — Script PowerShell : crée `pilot-business/`, copie le template CSV en `pilot-business/prospects.csv`, liste les docs clés.
- `docs/pilot-business-execution-mission-report.md` — Ce rapport.

## 4. Fichiers modifiés

- `docs/demo-script-10min.md` — Ajout d’un paragraphe « Exécution pilot business » avec liens vers offre, runbook, checklists.
- `docs/pilot-evidence-matrix.md` — Ajout paragraphe « Exécution pilot business » avec liens vers offre, ICP, pipeline, templates, checklists, runbook, prospects.
- `docs/pilot-kpi-minimum-spec.md` — En fin de Synthèse : lien vers checklist post-campaign et runbook lead-to-repeat.
- `docs/repeat-enterprise-definition.md` — En fin d’« Évolution possible » : lien vers runbook lead-to-repeat et pipeline.
- `docs/pilot-startup-quickstart.md` — Ajout ligne « Pack exécution pilot business » et mention du script `pilot-business-pack.ps1`.

## 5. Gates

- **Lint / typecheck** : aucun code produit modifié ; script PowerShell non exécuté par un linter TypeScript/ESLint. Pas de gate technique supplémentaire.
- **Cohérence** : offre ↔ ICP ↔ pipeline ↔ templates ↔ checklists : références croisées et vocabulaire aligné (pilot, campagne, résumé preuve, V2, citation, intro).
- **Alignement produit** : offre et templates décrivent le produit réel (dashboard, campagne, export, résumé preuve, duplication V2, Billing/Stripe). Aucune promesse de fonctionnalité non livrée.
- **Docs existantes** : demo-script, pilot-evidence-matrix, pilot-kpi-minimum-spec, repeat-enterprise-definition, pilot-startup-quickstart mis à jour avec des liens vers le pack business. Aucun flow produit modifié.

## 6. Diff résumé

- **8 nouveaux docs** : offre, ICP, pipeline, templates, checklist onboard, checklist post-campaign, template prospects CSV, runbook lead-to-repeat.
- **1 script** : pilot-business-pack.ps1 (init dossier + copie CSV).
- **5 docs modifiés** : demo-script, pilot-evidence-matrix, pilot-kpi-minimum-spec, repeat-enterprise-definition, pilot-startup-quickstart (ajouts de liens uniquement).

## 7. Ce qui est prêt pour exécuter le pilot business

- **Offre** : une page claire (pour qui, problème, promesse, contenu, livrable, limites, prix conseillé, CTA).
- **Ciblage** : ICP et segmentation actionnables (verticales, rôles, cas d’usage, signaux, priorité).
- **Suivi** : pipeline à 11 statuts + template CSV prospects (à utiliser dans Excel/Sheets ou équivalent).
- **Outreach / sales** : DM, email, relances, script call 15 min, script démo 20 min, script closing.
- **Opération** : checklist onboarding entreprise, checklist post-campagne (preuve + citation + logo + intro + V2 + relance), runbook du lead au repeat.
- **Démarrage** : `.\scripts\pilot-business-pack.ps1` pour créer `pilot-business/` et copier le fichier prospects ; ensuite éditer les docs et le CSV selon le process.

## 8. Ce qui restera pour la mission suivante

- Intégration CRM/outbound (HubSpot, Notion, Airtable, etc.) si besoin ultérieur.
- Page marketing publique ou landing dédiée (hors repo ou en static simple).
- Automatisation relances (email/LinkedIn) si souhaitée.
- Ajustement prix/offre selon premiers retours terrain.
