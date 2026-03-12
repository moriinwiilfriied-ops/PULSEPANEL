/**
 * Libellés UX critiques — Dashboard PulsePanel
 * Erreurs, états vides, actions.
 */

export const common = {
  loading: "Chargement…",
  connectRequired: "Connectez-vous.",
  errorTitle: "Erreur",
} as const;

export const home = {
  title: "Campagnes",
  loading: "Chargement…",
  empty: "Aucune campagne. Créez-en une pour commencer.",
  emptyTitle: "Aucune campagne",
  intro: "Créez des campagnes, suivez les réponses et gérez votre crédit.",
  ctaNewCampaign: "Nouvelle campagne",
  ctaBilling: "Crédit et facturation",
  metricCredit: "Crédit disponible",
  metricCampaignsActive: "Campagnes actives",
  metricResponses: "Réponses totales",
  linkAllCampaigns: "Voir toutes les campagnes",
} as const;

export const campaignsList = {
  title: "Campagnes",
  subtitle: "Liste de vos campagnes. Créez-en une, suivez les réponses et gérez le statut.",
  ctaNewCampaign: "Nouvelle campagne",
  ctaBilling: "Crédit et facturation",
  loading: "Chargement…",
  empty: "Aucune campagne. Créez-en une pour commencer.",
  emptyTitle: "Aucune campagne",
  loadError: "Impossible de charger les campagnes. Réessayez.",
  retry: "Réessayer",
  filterAll: "Toutes",
  filterActive: "Actives",
  filterPaused: "En pause",
  filterCompleted: "Terminées",
  emptyFilterHint: "Changez de filtre ou créez une campagne.",
  filterSegmentLabel: "Statut",
} as const;

export const testSwipe = {
  title: "Test swipe (Feed mobile)",
  intro: "Campagne dédiée au test du swipe, sans consommer le crédit réel.",
  ctaCreate: "Créer campagne test swipe",
  ctaReset: "Réinitialiser",
  ctaDelete: "Supprimer",
  confirmDelete: "Supprimer définitivement cette campagne test ? Les réponses seront perdues.",
  confirmReset: "Réinitialiser cette campagne test ? Les réponses seront perdues.",
  creating: "Création…",
  resetting: "Réinitialisation…",
  deleting: "Suppression…",
  errorCreate: "Impossible de créer la campagne test.",
  errorCreateDetail: "Détail (à afficher en dev) : ",
  errorActivationFailed: "La campagne test existe déjà mais n'a pas pu être activée.",
  errorActivationDetail: "Détail (à afficher en dev) : ",
  errorReset: "Impossible de réinitialiser.",
  errorDelete: "Impossible de supprimer.",
} as const;

export const campaignDelete = {
  confirmGeneric: "Si cette campagne n'a ni réponses ni facturation, elle sera supprimée définitivement. Sinon, elle sera archivée (masquée des listes, historique conservé). Continuer ?",
  resultDeletedHard: "Campagne supprimée définitivement.",
  resultDeletedSoft: "Campagne archivée. Elle n'apparaîtra plus dans les listes.",
  errorGeneric: "Impossible de supprimer ou archiver.",
} as const;

export const billing = {
  title: "Facturation",
  subtitle: "Crédit disponible, consommation et historique des transactions. Rechargez depuis le bandeau si besoin.",
  loading: "Chargement…",
  loadError: "Impossible de charger la facturation.",
  retry: "Réessayer",
  noOrg: "Connectez-vous et sélectionnez une organisation.",
  emptyLedger: "Aucune transaction.",
  sectionTransactions: "Historique des transactions",
  exportCsv: "Exporter CSV",
  exportJson: "Exporter JSON",
  toastNoExport: "Rien à exporter.",
  toastCsvDone: "Export CSV généré.",
  toastJsonDone: "Export JSON généré.",
  metricCredit: "Crédit disponible",
  metricSpent: "Dépensé",
} as const;

export const withdrawals = {
  title: "Retraits",
  subtitle: "Demandes de retrait des utilisateurs. Traitez les demandes en attente et consultez l'historique.",
  loading: "Chargement…",
  loadError: "Impossible de charger les retraits. Réessayez.",
  retry: "Réessayer",
  tabPending: "En attente",
  tabHistory: "Historique",
  emptyPending: "Aucun retrait en attente.",
  emptyHistory: "Aucun retrait dans l'historique.",
  statusPaid: "Payé",
  statusRejected: "Refusé",
  markPaid: "Marquer payé",
  reject: "Refuser",
  successPaid: "Retrait marqué comme payé.",
  successRejected: "Retrait refusé. Le montant a été remboursé.",
  metricPending: "En attente",
  metricHistory: "Dans l'historique",
  segmentLabel: "Vue",
} as const;

export const login = {
  title: "Connexion",
  subtitle: "PulsePanel",
  emailHint: "Indiquez votre e-mail pour recevoir un lien de connexion sécurisé.",
  errorEmailRequired: "Indiquez votre adresse e-mail.",
  errorSendFailed: "Envoi du lien échoué. Réessayez.",
  errorUnexpected: "Une erreur est survenue. Réessayez.",
  errorMissingCode: "Lien invalide ou expiré.",
  errorAuthFailed: "Échec de la connexion. Réessayez.",
  buttonSend: "Envoyer le lien de connexion",
  buttonSending: "Envoi…",
  sentMessage: "Un lien de connexion a été envoyé à",
  sentHint: "Ouvrez l’e-mail et cliquez sur le lien pour accéder au dashboard.",
  backToHome: "Retour à l’accueil",
} as const;

export const notFound = {
  title: "Page introuvable",
  message: "Cette page n’existe pas ou a été déplacée.",
  backToHome: "Retour à l’accueil",
} as const;

export const noAccess = {
  title: "Accès non configuré",
  message: "Votre compte est connecté, mais aucune organisation ne vous est encore associée.",
  hint: "Pour accéder au dashboard, contactez votre administrateur ou le support. L’association se fait côté administration.",
  action: "Changer de compte",
} as const;

export const selectOrg = {
  title: "Choisir une organisation",
  hint: "Vous avez accès à plusieurs organisations. Choisissez celle avec laquelle travailler pour cette session.",
  ctaContinue: "Accéder au dashboard",
  errorSelect: "Erreur lors de la sélection. Réessayez.",
} as const;

export const campaignCreate = {
  noOrg: "Aucune organisation. Rechargez la page ou sélectionnez une organisation.",
  insufficientCredit: "Crédit insuffisant. Rechargez votre compte entreprise (Billing) puis réessayez.",
  creationFailed: "Création impossible. Vérifiez les champs et réessayez.",
  creationFailedDetail: "En cas de doute, rechargez le crédit org depuis Billing.",
} as const;

/** Zone Admin — backoffice interne */
export const admin = {
  navOverview: "Vue d’ensemble",
  navUsers: "Utilisateurs",
  navWithdrawals: "Retraits",
  navFlags: "Signaux",
  navCampaigns: "Campagnes",
  navLedger: "Journal",
  navWebhooks: "Webhooks",
  backDashboard: "Dashboard",
  logout: "Déconnexion",
  overviewTitle: "Vue d’ensemble",
  usersTitle: "Utilisateurs",
  usersEmpty: "Aucun utilisateur.",
  withdrawalsTitle: "Retraits",
  withdrawalsEmpty: "Aucun retrait.",
  flagsTitle: "Signaux",
  flagsEmpty: "Aucun signal (ou aucun ne correspond aux filtres).",
  campaignsTitle: "Campagnes (global)",
  campaignsSubtitle: "Vue cross-org. Détail et actions sur chaque campagne.",
  campaignsEmpty: "Aucune campagne (ou aucun ne correspond aux filtres).",
  webhooksTitle: "Webhooks (audit)",
  webhooksSubtitle: "Journal des événements Stripe reçus.",
  webhooksEmpty: "Aucun événement (ou aucun ne correspond aux filtres).",
  ledgerTitle: "Journal",
  ledgerEmpty: "Aucune entrée.",
  loginTitle: "Admin PulsePanel",
  loginDisabled: "Admin désactivé",
  loginDisabledHint: "Définir ADMIN_DASHBOARD_PASSPHRASE pour activer l’accès.",
  loginBack: "Retour au dashboard",
  limitHint: "Limite 200. Cliquez sur un id pour détail et actions.",
  limitReadOnly: "Limite 200 derniers. Lecture seule.",
} as const;
