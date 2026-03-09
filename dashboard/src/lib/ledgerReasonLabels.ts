/**
 * Mapping canonique des raisons ledger (billing org + user) pour l’affichage.
 * Les valeurs en base ne sont pas modifiées ; on mappe à l’affichage uniquement.
 * Alias historiques : campaign_prepaid et campaign_activation → même libellé.
 */

/** Libellé humain pour chaque raison (canonique ou alias). Raisons inconnues renvoyées telles quelles. */
const LABELS: Record<string, string> = {
  // Billing org (org_ledger_entries)
  campaign_activation: "Activation campagne",
  campaign_prepaid: "Activation campagne",
  stripe_checkout: "Recharge Stripe",
  topup_stripe: "Recharge Stripe",
  topup_dev: "Recharge (DEV)",
  // User ledger (ledger_entries) — pour cohérence admin
  answer_reward: "Réponse (crédit)",
  withdraw_request: "Demande retrait",
};

/** Raison canonique pour regroupement (ex. campaign_prepaid et campaign_activation → campaign_activation). */
const CANONICAL: Record<string, string> = {
  campaign_prepaid: "campaign_activation",
  topup_stripe: "stripe_checkout",
};

/**
 * Retourne le libellé humain pour une raison ledger.
 * Fallback : retourne la raison telle quelle (pas de crash, affichage lisible).
 */
export function getLedgerReasonLabel(reason: string | null | undefined): string {
  if (reason == null || String(reason).trim() === "") return "—";
  const r = String(reason).trim();
  return LABELS[r] ?? r;
}

/**
 * Retourne la raison canonique (pour regroupement ou debug).
 * Si pas d’alias, retourne la raison inchangée.
 */
export function getLedgerReasonCanonical(reason: string | null | undefined): string {
  if (reason == null || String(reason).trim() === "") return "";
  const r = String(reason).trim();
  return CANONICAL[r] ?? r;
}
