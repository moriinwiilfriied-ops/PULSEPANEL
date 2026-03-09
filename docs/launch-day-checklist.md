# Checklist jour de lancement — Premier pilote

Court. Actionnable. À cocher le jour J0.

---

## Avant ouverture

1. **Build + smoke**
   - [ ] `.\scripts\prelaunch-dashboard-check.ps1` → PASS
   - [ ] `.\scripts\pilot-smoke.ps1` → PASS ou WARN documenté (0 FAIL)

2. **Seed / org pilot / compte entreprise**
   - [ ] Si seed utilisé : `.\scripts\pilot-seed.ps1` exécuté (ou SQL à la main)
   - [ ] Compte entreprise associé à l’org pilot (ou org cible)
   - [ ] Login dashboard OK → select-org ou / → crédit visible

3. **Source user prête**
   - [ ] Users disponibles pour répondre (recrutement pilot ou seed users)
   - [ ] Au moins une campagne visible côté mobile si feed dépend de données réelles

4. **Campagne pilot simple**
   - [ ] Une campagne choisie (seed [Pilot] ou créée) : question courte, options claires, quota modéré
   - [ ] Statut paused tant que pas de topup validé

5. **Budget / topup**
   - [ ] Crédit org suffisant pour la campagne (quota × reward)
   - [ ] Un topup test déjà fait (Stripe + webhook) et crédit reflété

---

## Lancement

6. **Lancer**
   - [ ] Activer la campagne (dashboard ou admin)
   - [ ] Vérifier campagne active côté dashboard et visible côté mobile (si applicable)
   - [ ] Premier répondant ou premier lot de réponses : pas d’erreur

---

## Surveillance

7. **Surveiller 1h / 4h / 24h**
   - [ ] 1h : réponses qui arrivent, pas d’erreur bulk, wallet pending cohérent
   - [ ] 4h : qualité campagne (détail campagne), flags si présents
   - [ ] 24h : KPI détail campagne, preuve (résumé) si quota atteint

8. **Capturer KPI / preuve**
   - [ ] Capture ou export : détail campagne (réponses, qualité, coût)
   - [ ] Si campagne terminée : copie résumé preuve (Markdown) pour case study
   - [ ] Admin : withdrawals pending, webhooks, flags (si pertinent)

9. **Décider V2 / follow-up**
   - [ ] Qualité OK → envisager V2 (duplication) ou autre campagne
   - [ ] Qualité à surveiller → revue flags, décision gel si besoin
   - [ ] Proof pack utilisé pour suivi commercial si pertinent

---

## Références

- Scénarios : `docs/pilot-critical-scenarios.md`
- Watchpoints 48h : `docs/post-launch-watchpoints.md`
- Preuves : `docs/pilot-evidence-matrix.md`
- GO/NO-GO : `docs/pilot-go-no-go-matrix.md`
