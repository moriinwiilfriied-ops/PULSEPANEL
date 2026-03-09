# Rapport mission — USER_PILOT_ACQUISITION_AND_SUPPLY_PACK_01

## 1. Vérifications initiales

- **Docs business / pilot confirmées** : pilot-offer-one-pager, pilot-icp-and-segmentation, pilot-pipeline-minimum, outreach-templates-pilot, pilot-kpi-minimum-spec, lead-to-repeat-runbook, proof-capture-and-client-reference-runbook, pilot-startup-quickstart, pilot-critical-scenarios. Toutes présentes et réutilisées.
- **Docs user / fraude confirmées** : user-devices-risk-runbook, daily-limits-and-server-guards-runbook, flags-and-withdrawal-freeze-runbook. Contenu aligné (devices, trust, flags, gel retraits, plafonds journaliers). Aucun doc dédié “acquisition user” ou “supply” avant la mission.
- **Trous côté acquisition user confirmés** : pas de plan de recrutement user, pas de segmentation des sources, pas de templates de recrutement, pas de checklist qualité user, pas de pipeline user-supply, pas de runbook acquisition ↔ fraude, pas de checklist source → première campagne.
- **Stratégie retenue** : tout en `docs/` (pas d’app, pas d’intégration). Plan, segmentation, templates, checklists, pipeline, CSV, runbook fraude, checklist source→campagne créés. Un script PowerShell minimal (`user-supply-pack.ps1`) pour initialiser un dossier local et copier le template CSV. Alignement des docs existantes par liens.

## 2. Choix retenus

- **Structure du plan** : objectif 200–500 users propres ; pourquoi pas de volume sale ; canaux prioritaires (TikTok organique, Reels, communautés, étudiants, Discord, micro-influenceurs) ; canaux à éviter (pub massive, giveaways, parrainage trop tôt, promesses de gains) ; rythme en 3 phases ; critères de qualité user.
- **Sources prioritaires** : P1 = petites communautés, micro-influenceurs, étudiants ; P2 = TikTok/Reels organiques, forums ; P3 = stories/posts, partenariats écoles. Pour chaque type : avantages, risques, contrôle, volume probable, risque fraude, cas d’usage.
- **Garde-fous retenus** : messages sans promesse délirante (templates + disclaimer) ; runbook qui relie acquisition et signaux fraude (flags, devices, daily limits, retraits) ; checklist qualité avec seuils “couper / scaler” ; checklist source→campagne avec KPI 24h/48h et go/no-go.
- **Limites assumées** : pas de traçabilité technique automatique “source” dans l’app (pas de paramètre UTM en base user) ; suivi manuel via CSV et pipeline. Pas de referral, pas d’ads, pas de nouvelle feature mobile.

## 3. Fichiers créés

- `docs/user-pilot-supply-plan.md` — Plan recrutement (objectif, pourquoi pas volume sale, canaux prioritaires/à éviter, rythme, critères qualité).
- `docs/user-source-segmentation.md` — Segmentation P1/P2/P3, avantages/risques, contrôle, volume, risque fraude, cas d’usage.
- `docs/user-recruitment-templates.md` — Script TikTok/Reel, légende, CTA, DM micro-influenceur, DM admin Discord, message communauté, relance, disclaimer honnête.
- `docs/checklist-user-pilot-quality.md` — Checklist qualité (source, volume, qualité observée, signaux fraude, confusion produit, trust/retraits/flags, quand couper, quand scaler).
- `docs/user-supply-pipeline-minimum.md` — Pipeline 7 statuts (Source identifiée → Test contenu lancé → Premiers users arrivés → Qualité OK / Source à surveiller / Source coupée / Source à scaler) avec définition, next step, signal succès, signal arrêt.
- `docs/user-sources-template.csv` — Template suivi sources (source_name, source_type, owner, status, date_started, est_users, actual_users, trust_quality_note, fraud_note, keep_or_cut, next_step, notes) avec 3 lignes EXEMPLE.
- `docs/user-acquisition-fraud-guardrails-runbook.md` — Runbook recruter proprement (ce qu’on veut/évite, surveiller qualité, signaux flags/devices/daily limits/retraits, quand surveiller, quand geler/couper, ce qu’il ne faut pas promettre).
- `docs/checklist-source-to-first-campaign.md` — Checklist source→première campagne (source prête, volume minimal, campagne prête, KPI 24h/48h, signaux qualité, go/no-go).
- `scripts/user-supply-pack.ps1` — Script : crée `user-pilot/`, copie user-sources-template.csv en user-pilot/user-sources.csv, liste les docs du pack.
- `docs/user-pilot-acquisition-mission-report.md` — Ce rapport.

## 4. Fichiers modifiés

- `docs/pilot-kpi-minimum-spec.md` — En fin de Synthèse : paragraphe “Acquisition user pilot” avec liens vers user-pilot-supply-plan, checklist-source-to-first-campaign, user-acquisition-fraud-guardrails-runbook.
- `docs/lead-to-repeat-runbook.md` — En fin : paragraphe “Supply user” avec liens vers user-pilot-supply-plan, checklist-source-to-first-campaign, user-acquisition-fraud-guardrails-runbook.
- `docs/pilot-startup-quickstart.md` — Ligne “Pack acquisition user pilot” et mention du script user-supply-pack.ps1.
- `docs/pilot-critical-scenarios.md` — Après “Dataset démo” : paragraphe “Supply user” avec liens vers user-pilot-supply-plan, checklist-source-to-first-campaign, user-acquisition-fraud-guardrails-runbook.

## 5. Gates

- **Lint / typecheck** : aucun code produit modifié. Script PowerShell non soumis au linter TypeScript/ESLint.
- **Cohérence** : plan ↔ segmentation ↔ templates ↔ pipeline ↔ checklists ↔ runbook : vocabulaire aligné (sources, qualité, flags, devices, couper/scaler), références croisées.
- **Alignement produit** : templates et runbook décrivent le produit réel (micro-récompenses, pending/available, retrait manuel, feed, answer). Référence aux runbooks existants (user-devices, daily-limits, flags-and-withdrawal-freeze).
- **Alignement trust/fraude** : runbook et checklist qualité s’appuient explicitement sur flags, devices, daily limits, gel retraits ; pas de contradiction avec les runbooks existants.
- **Aucun flow produit cassé** : aucune modification du code dashboard, mobile, supabase.

## 6. Diff résumé

- **9 nouveaux docs** : plan supply, segmentation sources, templates recrutement, checklist qualité user, pipeline user-supply, template CSV sources, runbook acquisition-fraude, checklist source→première campagne, rapport mission.
- **1 script** : user-supply-pack.ps1 (init dossier user-pilot + copie CSV).
- **4 docs modifiés** : pilot-kpi-minimum-spec, lead-to-repeat-runbook, pilot-startup-quickstart, pilot-critical-scenarios (ajouts de liens uniquement).

## 7. Ce qui est prêt pour recruter proprement les premiers users pilot

- **Plan** : objectif 200–500 users, canaux prioritaires/à éviter, rythme, critères qualité.
- **Segmentation** : sources P1/P2/P3 avec avantages, risques, contrôle, volume, risque fraude, cas d’usage.
- **Templates** : script Reel/TikTok, légende, CTA, DM influenceur, DM admin Discord, message communauté, relance, disclaimer.
- **Qualité** : checklist pour évaluer une source (volume, qualité, signaux fraude, quand couper/scaler).
- **Pipeline** : 7 statuts avec next steps et signaux ; template CSV pour le suivi manuel.
- **Runbook fraude** : quoi recruter/éviter, quels signaux regarder (flags, devices, daily limits, retraits), quand surveiller, quand geler/couper, ce qu’il ne faut pas promettre.
- **Lien campagnes** : checklist source→première campagne (volume minimal, KPI 24h/48h, go/no-go).
- **Démarrage** : `.\scripts\user-supply-pack.ps1` pour créer user-pilot/ et copier le CSV ; ensuite utiliser les docs et le CSV selon le process.

## 8. Ce qui restera pour la mission suivante

- Traçabilité technique “source” en base (ex. champ user.source ou paramètre inscription) si besoin de mesurer par cohorte automatiquement.
- Parrainage / referral quand la base et les garde-fous sont stabilisés.
- Tests A/B sur messages d’acquisition (hors repo, ou outil externe).
- Intégration ads (Meta, TikTok) plus tard, si volume maîtrisé et process qualité rodé.
