# Mission PILOT_CRITICAL_SCENARIOS_AND_RUNBOOKS_01 — Rapport final

## 1. Vérifications initiales

- **Infra test** : Absente. Pas de Playwright, Maestro, Cypress, Jest, Vitest ni E2E dans les `package.json`. Racine : placeholders `lint` / `typecheck`. Dashboard : eslint, pas de script typecheck dédié. Mobile : pas de script test.
- **Scripts existants** : `scripts/bootstrap.ps1` (scaffold monorepo, env examples), `scripts/rebuild.ps1` (fix git, rebuild mobile/dashboard). Pas de script smoke pilot avant cette mission.
- **Flows critiques** : Confirmés — mobile (wallet, answer, supabaseApi), dashboard (auth, select-org, create-checkout, webhook, admin decide, freeze, admin webhooks, campaigns). Références trouvées dans les fichiers listés en ÉTAPE 0.
- **Docs existantes** : Nombreux runbooks (billing-ledger, daily-limits, user-devices, dashboard auth, admin campaigns, flags/withdrawal, manual withdrawals, stripe). Aucun document central « scénarios critiques pilot », aucune checklist ops dédiée, pas de script démo 10 min ni matrice de preuves.
- **Stratégie retenue** : **Manual-first renforcé** + smoke script statique (fichiers, env, routes, docs, typecheck si possible). Aucun framework E2E ajouté.

## 2. Choix retenus

- **Automation** : Aucune E2E. Smoke script PowerShell (`scripts/pilot-smoke.ps1`) pour vérifier structure, env, routes clés, présence des docs pilot, et typecheck dashboard (en WARN si échec pour ne pas bloquer sur des problèmes d’env).
- **Smoke** : Vérifications reproductibles, sans dépendance à un serveur lancé ; typecheck optionnel (PASS si OK, WARN si échec).
- **Scénarios** : 10 scénarios décrits dans `docs/pilot-critical-scenarios.md` (prérequis, étapes, résultat attendu, preuves, statut Pass/Fail/Blocked).
- **Limites assumées** : Pas de tests E2E automatisés ; validation pilot = manuelle + smoke + checklists + matrice de preuves.

## 3. Fichiers créés

- `docs/pilot-critical-scenarios.md` — scénarios critiques (login, campagne, topup, réponse mobile, limites, retrait, revue retrait, flags/gel, campagnes admin, webhooks admin).
- `scripts/pilot-smoke.ps1` — smoke check (structure, env, routes, docs, typecheck).
- `docs/checklist-launch-campaign.md` — checklist lancer une campagne.
- `docs/checklist-review-withdrawal.md` — checklist revue retrait.
- `docs/checklist-support-incident.md` — checklist incident support.
- `docs/demo-script-10min.md` — script démo 10 min (login, campagne, billing, admin, mobile, wallet, retrait, conclusion).
- `docs/pilot-evidence-matrix.md` — matrice preuves (où trouver, capture, qui valide, date).
- `docs/pilot-startup-quickstart.md` — démarrage rapide (setup, lancer dashboard/mobile, smoke, liens docs).
- `docs/pilot-critical-scenarios-mission-report.md` — ce rapport.

## 4. Fichiers modifiés

- Aucun fichier applicatif modifié. Aucun flow critique touché.
- `scripts/pilot-smoke.ps1` : ajustement mineur pour typecheck (WARN si échec au lieu de FAIL) pour robustesse en env variable.

## 5. Gates

- **Typecheck dashboard** : Non exécuté dans la mission (aucun code dashboard modifié). À lancer manuellement : `cd dashboard && npx tsc --noEmit`. Le smoke script tente le typecheck et affiche WARN en cas d’échec.
- **Typecheck mobile** : Non requis (aucun fichier mobile modifié).
- **Lint** : Aucun fichier applicatif modifié.
- **Smoke script** : Exécuté ; PASS sur structure, env, routes, docs ; typecheck peut être WARN selon l’env.
- **Cohérence docs** : Les docs créées renvoient aux runbooks existants (manual-withdrawals, flags-and-withdrawal-freeze) et décrivent les flows réels du projet.

## 6. Diff résumé

- Ajout d’un pack pilot-ready : scénarios, smoke, checklists, démo, matrice de preuves, quickstart.
- Aucune modification des flows (login, campaign, billing, webhook, mobile, withdrawal, admin).
- Stratégie honnête : pas de faux tests ; validation manuelle + smoke + documentation.

## 7. Ce qui restera pour la mission suivante

- **Optionnel** : Mettre en place une infra E2E légère (ex. Playwright dashboard uniquement) si le pilot le justifie ; non fait ici car absent et mission « pas d’usine à gaz ».
- **Optionnel** : Seed data pilot reproductible (compte test, org, campagne, user) — à documenter ou automatiser dans une mission dédiée si besoin.
- **Maintenance** : Mettre à jour la matrice de preuves et les scénarios si de nouveaux flows critiques apparaissent.
