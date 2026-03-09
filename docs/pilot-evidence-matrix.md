# Matrice de preuves pilot — PulsePanel

Pour chaque scénario critique : preuve attendue, où la trouver, type de capture, qui valide, date.

| Scénario | Preuve attendue | Où la trouver | Capture / log | Qui valide | Date test |
|----------|-----------------|--------------|--------------|------------|-----------|
| 1. Login dashboard | Page d’accueil, crédit org ou liste campagnes | `/` ou `/campaigns`, header | Capture écran | Ops / QA | |
| 2. Création campagne | Campagne créée, statut, ligne ledger | Dashboard Campagnes, Billing ou Admin Ledger | Capture + ligne ledger | Ops / QA | |
| 3. Topup Stripe | Crédit augmenté, ligne « Recharge Stripe » | Billing, Admin → Ledger (org_ledger_entries) | Capture + export CSV si besoin | Ops / QA | |
| 4. Réponse mobile | Réponse enregistrée, pending dans wallet | App mobile (feed → answer → wallet) ; Admin User/Campaign | Capture mobile | Ops / QA | |
| 5. Limites journalières | Message refus (limite atteinte) | App ou réponse API ; Admin User (usage du jour) | Capture ou log | Ops / QA | |
| 6. Demande retrait | Withdrawal pending ou message refus (gel/limite) | App wallet ; Admin → Withdrawals | Capture + ligne withdrawal | Ops / QA | |
| 7. Revue admin retrait | Décision (rejected/paid) avec note / référence | Admin → Withdrawals → [id] | Capture détail ; table withdrawals | Ops | |
| 8. Flags / gel | Action flag (legit/watch/freeze), gel actif, refus retrait puis dégel | Admin Flags, Admin Users, App wallet | Captures admin + message app | Ops | |
| 9. Campagnes admin | Liste cross-org, détail, changement statut | Admin → Campaigns, Admin → Campaigns → [id] | Capture liste + détail | Ops / QA | |
| 10. Webhooks admin | Liste événements, détail avec statut | Admin → Webhooks, Admin → Webhooks → [id] | Capture liste + détail | Ops / QA | |
| Preuve campagne / case study | Résumé preuve, chiffre fort, résumé copiable | Dashboard → Campagnes → [id] (campagne terminée) → Résumé preuve | Copier le résumé (Markdown) + capture écran | Ops / Commercial | |

---

**Dry run (mission PILOT_DRY_RUN_AND_GO_NO_GO_01)**

- **Scripts** : prelaunch-dashboard-check.ps1 PASS ; pilot-smoke.ps1 PASS (2 WARN typecheck/build selon env). Gate stricte = prelaunch.
- **Scénarios** : tous implémentés en code ; vérification manuelle requise avant J0 (passage réel des 10 scénarios + proof pack). Remplir colonne « Date test » et « Qui valide » au passage.
- **Rapport** : `docs/pilot-dry-run-report.md`. **GO/NO-GO** : `docs/pilot-go-no-go-matrix.md`. **Checklist J0** : `docs/launch-day-checklist.md`. **Watchpoints 48h** : `docs/post-launch-watchpoints.md`.

---

**Règles**

- **Capture** : écran ou export (CSV, détail page). Éviter de dépendre uniquement de la mémoire.
- **Qui valide** : une personne nommée ou rôle (Ops, QA) ; à renseigner au moment du test.
- **Date test** : à remplir à chaque passage pilot / régression.

Lier cette matrice à `docs/pilot-critical-scenarios.md` (statut Pass/Fail/Blocked par scénario). Dataset démo : `docs/pilot-seed-dataset.md`, procédure : `docs/pilot-seed-quickstart.md`.

**Preuve commerciale** : pour une campagne terminée, utiliser le bloc « Résumé preuve » sur la page détail campagne (chiffre fort, copie Markdown). Template mini case study : `docs/case-study-template.md`. Runbook citation / logo / intro : `docs/proof-capture-and-client-reference-runbook.md`.

**Exécution pilot business** : offre pilot : `docs/pilot-offer-one-pager.md`. ICP et segmentation : `docs/pilot-icp-and-segmentation.md`. Pipeline : `docs/pilot-pipeline-minimum.md`. Templates outreach / closing : `docs/outreach-templates-pilot.md`. Checklists onboarding et post-campaign : `docs/checklist-onboard-pilot-company.md`, `docs/checklist-post-campaign-proof-repeat.md`. Runbook du lead au repeat : `docs/lead-to-repeat-runbook.md`. Prospects : `docs/pilot-prospects-template.csv`.
