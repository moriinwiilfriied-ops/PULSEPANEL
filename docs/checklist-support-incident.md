# Checklist — Incident support (pilot)

Réaction structurée à un incident ou une escalade.

---

## 1. Type d’incident

- [ ] **User** : retrait bloqué, compte gelé, erreur app, litige paiement.
- [ ] **Org** : crédit, campagne, accès dashboard.
- [ ] **Campagne** : qualité, abus, spam, technique.

## 2. Identifier

- [ ] **User** : Admin → Users → rechercher (id, email).
- [ ] **Org** : dashboard org ou Admin → Campaigns (org_id).
- [ ] **Campagne** : Admin → Campaigns → [id] ou dashboard org.

## 3. Pages admin à ouvrir

- **User** : Admin → Users → [id] (solde, gel, usage journalier, flags).
- **Flags** : Admin → Flags (filtrer par user si besoin) → [id] (détail, actions).
- **Withdrawals** : Admin → Withdrawals (filtrer pending / user).
- **Webhooks** : Admin → Webhooks (si incident Stripe / topup).
- **Campagnes** : Admin → Campaigns → [id] (qualité, statut, pause/terminate si besoin).

## 4. Vérifications

- **Gel** : user_risk_controls → withdrawals_frozen, motif, note.
- **Limites** : usage du jour (réponses, reward cents, demandes retrait) vs trust_daily_limits.
- **Retrait** : statut, référence externe si paid, note admin.
- **Qualité** : campaign_quality_stats, flags (too_fast, empty, etc.).

## 5. Actions possibles

- **Escalade** : noter dans admin_note (flag, user, withdrawal), transmettre en interne.
- **Bloquer** : geler les retraits (Flags → [id] ou Users → [id]) avec motif + note.
- **Dégeler** : Users → [id] → Dégeler + note (quand la situation est résolue).
- **Campagne** : Pause / Terminer si abus ou incident (Admin → Campaigns → [id]).

## 6. Noter

- **Qui, quoi, quand** : dans les champs admin_note (flags, user_risk_controls, withdrawal).
- **Preuve** : référence externe pour les paiements ; capture ou lien vers ticket si utile.

---

Référence : `docs/flags-and-withdrawal-freeze-runbook.md`, `docs/manual-withdrawals-runbook.md`.
