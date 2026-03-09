/**
 * Libellés UX critiques — Dashboard PulsePanel
 * Erreurs, états vides, actions.
 */

export const common = {
  loading: "Chargement…",
  connectRequired: "Connectez-vous.",
} as const;

export const home = {
  title: "Campagnes",
  loading: "Chargement…",
  empty: "Aucune campagne. Créez-en une pour commencer.",
  intro: "Créez des campagnes, suivez les réponses et gérez votre crédit.",
  ctaNewCampaign: "Nouvelle campagne",
  ctaBilling: "Crédit et facturation",
} as const;

export const billing = {
  loadError: "Impossible de charger la facturation.",
  emptyLedger: "Aucune transaction.",
  noOrg: "Connectez-vous et sélectionnez une organisation.",
} as const;

export const login = {
  title: "Connexion — PulsePanel",
  emailHint: "Entrez votre e-mail pour recevoir un lien de connexion.",
  errorEmailRequired: "Indiquez votre adresse e-mail.",
  errorSendFailed: "Envoi du lien échoué. Réessayez.",
  errorUnexpected: "Une erreur est survenue. Réessayez.",
  errorMissingCode: "Lien de connexion invalide ou expiré.",
  errorAuthFailed: "Échec de la connexion. Réessayez.",
  buttonSend: "Envoyer le lien de connexion",
  buttonSending: "Envoi…",
  sentMessage: "Un lien de connexion a été envoyé à",
  sentHint: "Cliquez sur le lien dans l'e-mail pour accéder au dashboard.",
  backToHome: "Retour à l'accueil",
} as const;

export const noAccess = {
  title: "Accès non configuré",
  message: "Votre compte est connecté, mais aucun accès à une organisation n'est configuré.",
  hint: "Pour obtenir l'accès au dashboard, contactez l'administrateur ou le support. L'association à une organisation se fait côté administration.",
  action: "Changer de compte",
} as const;

export const selectOrg = {
  title: "Choisir une organisation",
  hint: "Vous avez accès à plusieurs organisations. Sélectionnez celle à utiliser pour cette session.",
  errorSelect: "Erreur lors de la sélection. Réessayez.",
} as const;

export const campaignCreate = {
  insufficientCredit: "Crédit insuffisant. Rechargez votre compte entreprise (Billing) puis réessayez.",
  creationFailed: "Création impossible. Vérifiez les champs et réessayez.",
  creationFailedDetail: "En cas de doute, rechargez le crédit org depuis Billing.",
} as const;
