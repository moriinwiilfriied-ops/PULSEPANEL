/**
 * Libellés UX critiques — Mobile PulsePanel
 * Vocabulaire cohérent : gains, solde, retrait, erreurs.
 */

export const wallet = {
  title: "Portefeuille",
  pendingLabel: "En attente",
  pendingHint: "Gains en cours de validation (réponses récentes)",
  availableLabel: "Disponible",
  availableHint: "Montant que vous pouvez demander en retrait",
  totalLabel: "Total",
  withdrawTitle: "Demander un retrait",
  withdrawButton: "Demander un retrait",
  withdrawSending: "Envoi…",
  withdrawMinAmount: "Montant minimum : 5,00 €",
  withdrawInsufficient: "Solde insuffisant",
  withdrawFrozen: "Les retraits sont temporairement indisponibles pour ce compte. Contacte le support si nécessaire.",
  withdrawDailyLimit: "Tu as déjà atteint la limite de demandes de retrait pour aujourd'hui.",
  withdrawGenericError: "Impossible de demander le retrait. Réessayez plus tard.",
  withdrawHintMin: "Montant minimum de retrait : 5 €. Rechargez en répondant à des campagnes.",
  historyTitle: "Historique",
  myWithdrawalsTitle: "Mes retraits",
  emptyHistory: "Aucune réponse pour l'instant.",
  emptyWithdrawals: "Aucun retrait pour l'instant.",
  noBalanceBanner: "Répondez à une campagne pour voir votre solde ici.",
  statusPending: "En attente",
  statusAvailable: "Disponible",
  statusPaid: "Payé",
  statusRejected: "Refusé",
} as const;

export const feed = {
  title: "Feed",
  emptyLoadError: "Impossible de charger les campagnes.",
  emptyNoCampaigns: "Aucune campagne disponible pour le moment.",
  emptyMock: "Plus de questions pour l'instant.",
  emptySubError: "Vérifiez votre connexion et réessayez.",
  emptySubDefault: "Revenez plus tard pour gagner des récompenses.",
} as const;

export const answer = {
  submitErrorDefault: "Impossible d'enregistrer la réponse. Réessayez.",
} as const;
