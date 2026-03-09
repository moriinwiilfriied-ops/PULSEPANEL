# Mission BILLING_LEDGER_REASON_LABELS_COHERENCE_01 — Vérifications initiales

## 1. Chemins confirmés

- **dashboard** : app/billing/page.tsx (REASON_LABELS local, reasonToLabel), app/admin/ledger/page.tsx (reason en brut), src/lib/supabase.ts (list_org_ledger, OrgLedgerRow.reason), adminData (getAdminLedgerEntries, getAdminOrgLedgerEntries, reason).
- **supabase** : 0011 org_ledger_entries + campaign_prepaid + topup_dev ; 0012 campaign_prepaid ; 0013 campaign_activation (bill_campaign_on_activate) ; 0015 org_credit_topup(topup_stripe) ; 0016/0017 list_org_ledger ; webhook route p_reason "stripe_checkout".

## 2. Raisons écrites confirmées

**org_ledger_entries (billing org) :**
- `campaign_activation` — trigger bill_campaign_on_activate (0013, 0013_billing_trigger_fk_fix.sql).
- `campaign_prepaid` — ancien trigger (0011, 0012).
- `stripe_checkout` — webhook Stripe appelle org_credit_topup avec p_reason "stripe_checkout".
- `topup_stripe` — défaut dans org_credit_topup (0015).
- `topup_dev` — org_topup_dev (0011).

**ledger_entries (user) :** answer_reward, withdraw_request, etc. — hors périmètre billing org ; on peut les mapper pour l’admin ledger.

## 3. Écrans d’affichage confirmés

- **Billing org** (billing/page.tsx) : REASON_LABELS avec stripe_checkout, topup_dev, campaign_prepaid. **campaign_activation absent** → affiché en brut. reasonToLabel utilisé pour le tableau et l’export CSV (colonne "label").
- **Admin ledger** (admin/ledger/page.tsx) : r.reason affiché en brut pour user et org (pas de mapping).

## 4. Coexistence campaign_prepaid / campaign_activation confirmée

- Historique : campaign_prepaid (0011, 0012).
- Actuel : campaign_activation (0013). Les deux peuvent exister en base ; aucun trigger ni flux à modifier.

## 5. Stratégie retenue

- Conserver les valeurs DB. Créer une source de vérité d’affichage unique (ledgerReasonLabels.ts) avec mapping + alias. campaign_activation et campaign_prepaid → libellé canonique "Activation campagne". Unifier billing et admin ledger sur getLedgerReasonLabel. Pas de migration des données.
