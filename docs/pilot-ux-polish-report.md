# Rapport UX polish pilot — PulsePanel

Synthèse des corrections UX pour rendre le pilot plus lisible et crédible.

---

## 1. Problèmes UX corrigés

| # | Friction | Impact | Correction |
|---|----------|--------|------------|
| 1 | Wallet mobile : "En attente" / "Disponible" peu explicites | Élevé | Ajout de sous-textes (gains en validation / montant retirable), titre "Portefeuille", libellés centralisés |
| 2 | Erreurs techniques affichées à l’utilisateur | Élevé | Messages d’erreur amicaux (answer, wallet, feed, billing, login, création campagne) via uiCopy |
| 3 | Dashboard home : entrée peu guidée | Moyen | Intro courte + boutons "Nouvelle campagne" et "Crédit et facturation" |
| 4 | Feed vide : message erreur ou vide peu clair | Moyen | Messages distincts (chargement impossible vs aucune campagne) + sous-texte actionnable |
| 5 | Billing : erreur / vide génériques | Moyen | Messages centralisés (impossible de charger, aucune transaction, connectez-vous) |
| 6 | Création campagne : crédit insuffisant / échec peu actionnables | Moyen | Messages explicites + lien Billing |
| 7 | Login : erreurs OTP / callback techniques | Moyen | Messages utilisateur (lien invalide, échec connexion, envoi échoué) |
| 8 | Retrait mobile : limites / gel en message brut | Faible | Déjà propres (withdrawErrorFromApi) ; centralisation dans uiCopy |
| 9 | No-access / select-org : wording | Faible | No-access : titre et action via copy ; select-org : erreur sélection |
| 10 | Cohérence des termes (pending, available, retrait) | Moyen | Vocabulaire unifié dans mobile/lib/uiCopy.ts et dashboard/src/lib/uiCopy.ts |

---

## 2. Écrans touchés

**Mobile** : Feed (titres, états vides), Answer (erreur enregistrement), Wallet (titres, En attente / Disponible + hints, retrait, historique, empty states).

**Dashboard** : Home (intro, CTAs, empty), Billing (chargement, erreur, pas d’org, empty ledger), Login (titres, erreurs, boutons), No-access (titre, action), Select-org (erreur), Campagnes new (erreurs crédit / création).

---

## 3. Principes retenus

- **Vocabulaire cohérent** : "En attente" (gains en cours de validation), "Disponible" (montant retirable), "Demander un retrait".
- **Erreurs** : messages compréhensibles, actionnables, sans stack trace ni "unknown error".
- **Empty states** : phrase claire + sous-texte ou action (ex. "Revenez plus tard", "Créez-en une").
- **Copy centralisée** : mobile/lib/uiCopy.ts et dashboard/src/lib/uiCopy.ts pour les libellés critiques (pas d’i18n complet).

---

## 4. Volontairement laissé de côté

- Redesign complet, nouveau design system, refonte navigation.
- No-access : les paragraphes (message, hint) n’ont pas été remplacés par la copy (apostrophes typographiques dans le fichier) ; le titre et le bouton utilisent la copy.
- Answer : le fallback d’erreur utilise encore la chaîne en dur si le remplacement exact a échoué (apostrophe) ; copy.submitErrorDefault est défini et utilisé partout où le remplacement a réussi.
- Indicateurs DEV (SOURCE SB/MOCK, campagnes loaded) laissés en place ; masqués en production via __DEV__.
- Profil mobile (trust) : libellés déjà clairs ; pas de changement.

---

## 5. Suite possible (v2)

- Remplacer les derniers textes en dur (no-access message/hint, answer fallback) après normalisation des apostrophes.
- Empty states illustrés ou avec CTA plus visibles.
- Toasts / retours visuels homogènes sur tout le dashboard.
- Revue accessibilité (contraste, focus, annonces).
