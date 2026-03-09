# Runbook — Raisons ledger (billing org)

## 1. Quelles raisons sont réellement utilisées

**org_ledger_entries (billing org) :**
- **campaign_activation** — écrit par le trigger actuel `bill_campaign_on_activate` (activation campagne).
- **campaign_prepaid** — historique (ancien trigger).
- **stripe_checkout** — écrit par le webhook Stripe après paiement (org_credit_topup).
- **topup_stripe** — défaut du paramètre dans org_credit_topup (peut apparaître si appel sans raison).
- **topup_dev** — RPC org_topup_dev (environnement dev).

**ledger_entries (user)** : answer_reward, withdraw_request, etc. — mappés côté affichage admin pour cohérence.

## 2. Raisons historiques / alias

- **campaign_prepaid** = ancienne valeur pour « débit campagne ». Aujourd’hui le trigger écrit **campaign_activation**. Les deux sont affichés avec le même libellé : « Activation campagne ».
- **topup_stripe** = alias affiché comme « Recharge Stripe » (même libellé que stripe_checkout).

## 3. Libellé humain canonique retenu

| Raison (DB)           | Libellé affiché    |
|-----------------------|--------------------|
| campaign_activation    | Activation campagne |
| campaign_prepaid       | Activation campagne |
| stripe_checkout        | Recharge Stripe    |
| topup_stripe           | Recharge Stripe    |
| topup_dev              | Recharge (DEV)     |
| answer_reward          | Réponse (crédit)   |
| withdraw_request       | Demande retrait    |
| (autre)                | valeur brute       |

Source de vérité côté code : `dashboard/src/lib/ledgerReasonLabels.ts` (getLedgerReasonLabel).

## 4. Pourquoi on n’écrase pas l’historique DB

- Les lignes existantes gardent leur `reason` d’origine (audit, cohérence avec l’historique des migrations).
- Unifier l’affichage via un mapping évite des migrations de masse et des risques sur les données.
- En cas de besoin (debug, support), la valeur brute reste disponible (export, tooltip, ou colonne secondaire).

## 5. Si une nouvelle raison apparaît plus tard

- Ajouter l’entrée dans `ledgerReasonLabels.ts` (LABELS, et CANONICAL si alias).
- Documenter ici et dans le rapport de mission si besoin.
- Ne pas modifier les triggers ni les RPC existants sans nécessité métier.
