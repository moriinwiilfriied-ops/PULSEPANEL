# Checklist — Revue d’un retrait (pilot)

À suivre pour chaque retrait en attente (Admin → Withdrawals → [id]).

---

## Identification

- [ ] **User** identifié (id, email si affiché).
- [ ] **Montant** vérifié (cents / devise).
- [ ] **Statut** = pending.

## Avant décision

- [ ] **Trace de paiement** : le virement / paiement externe a-t-il déjà été effectué ?
  - **Non** → ne pas marquer payé. Laisser en pending ou rejeter si motif.
  - **Oui** → préparer référence externe, canal, note admin.

## Quand rejeter

- Litige, suspicion, motif politique, ou demande d’annulation.
- Renseigner **motif de rejet** (obligatoire) et **note admin**.
- Valider → le montant est remboursé sur le solde du user.

## Quand marquer payé

- **Uniquement après** virement/paiement externe effectué.
- Renseigner **référence externe** (n° virement, ID transaction).
- Choisir **canal** (virement bancaire / PayPal / autre).
- Renseigner **note admin** (courte).
- Cocher la confirmation « Paiement externe déjà effectué ».
- Valider.

## Ce qu’il faut noter

- **Rejet** : motif + note admin (pour traçabilité et support).
- **Paid** : référence externe + canal + note admin (pour litiges « je n’ai rien reçu »).

---

Référence détaillée : `docs/manual-withdrawals-runbook.md`.
