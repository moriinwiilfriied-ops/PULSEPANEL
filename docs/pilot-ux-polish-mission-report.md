# Mission PILOT_UX_STABILIZATION_AND_ERROR_POLISH_01 — Rapport final

## 1. Vérifications initiales

- **Écrans cœur confirmés** : Mobile (feed, answer, wallet, profile), Dashboard (page d’accueil, billing, campaigns/new, campaigns/[id], login, select-org, no-access).
- **Frictions confirmées** : Wallet sans explication pending/available ; erreurs techniques possibles (answer, feed, billing, login, création campagne) ; home dashboard sans CTA clairs ; empty states parfois vagues ; incohérence des libellés.
- **Périmètre retenu** : Feed, Answer, Wallet, Home dashboard, Billing, Login, No-access, Select-org, Campagnes new. Pas de refonte, pas de nouvelles features.
- **Stratégie retenue** : Couche uiCopy (mobile + dashboard), harmonisation des messages d’erreur et des empty states, hints wallet, CTAs home, wording unifié.

## 2. Top frictions corrigées

1. **Wallet mobile** : Titre "Portefeuille", sous-textes "En attente" (gains en validation) / "Disponible" (montant retirable), empty/hint retrait, libellés centralisés.
2. **Erreurs utilisateur** : Answer, wallet retrait, feed, billing, login, création campagne → messages uiCopy (compréhensibles, non techniques).
3. **Home dashboard** : Intro + boutons "Nouvelle campagne" et "Crédit et facturation".
4. **Feed** : Messages vides distincts (erreur chargement / aucune campagne) + sous-texte.
5. **Billing** : Chargement, erreur, pas d’org, empty ledger via copy.
6. **Login** : Titre, hint, erreurs (email requis, envoi échoué, inattendu, missing_code, auth_failed), boutons, lien retour.
7. **Création campagne** : Crédit insuffisant et création impossible avec messages actionnables.
8. **No-access** : Titre et action via copy (paragraphes laissés en dur pour cause d’apostrophes typographiques).
9. **Select-org** : Message d’erreur de sélection via copy.
10. **Cohérence** : Vocabulaire pending/available/retrait unifié dans les deux uiCopy.

## 3. Fichiers créés

- `mobile/lib/uiCopy.ts` — wallet, feed, answer.
- `dashboard/src/lib/uiCopy.ts` — common, home, billing, login, noAccess, selectOrg, campaignCreate.
- `docs/pilot-ux-polish-report.md` — synthèse problèmes, écrans, principes, laissé de côté, v2.
- `docs/pilot-ux-polish-mission-report.md` — ce rapport.

## 4. Fichiers modifiés

- `mobile/app/(tabs)/wallet.tsx` — copy, hints sous En attente/Disponible, libellés, empty/hint retrait.
- `mobile/app/(tabs)/feed.tsx` — copy, messages et sous-textes empty.
- `mobile/app/answer.tsx` — import copy ; fallback erreur (copy.submitErrorDefault là où le remplacement a été appliqué).
- `dashboard/app/page.tsx` — copy, intro, CTAs Nouvelle campagne / Crédit et facturation.
- `dashboard/app/billing/page.tsx` — copy (loading, erreur, connectez-vous, emptyLedger).
- `dashboard/app/login/page.tsx` — copy (titre, hint, erreurs, boutons, lien retour).
- `dashboard/app/no-access/page.tsx` — import copy, titre et action via copy.
- `dashboard/app/select-org/SelectOrgForm.tsx` — copy, erreur sélection.
- `dashboard/app/campaigns/new/page.tsx` — copy, messages insufficient_org_credit et creation_failed.

## 5. Gates

- **Typecheck dashboard** : OK.
- **Typecheck mobile** : Erreurs préexistantes (layout, Colors, onboarding, etc.) ; aucun fichier modifié par la mission n’a introduit de nouvelle erreur.
- **Lint** : Aucune erreur sur les fichiers touchés.
- **Flows** : Aucun flow métier modifié (login, select-org, create campaign, billing, feed → answer → wallet, retrait).

## 6. Diff résumé

- Copy centralisée (mobile + dashboard) pour erreurs, empty states, libellés critiques.
- Wallet plus lisible (Portefeuille, hints pending/available, empty/hint retrait).
- Home dashboard avec intro et CTAs.
- Erreurs harmonisées et non techniques sur les écrans cœur.
- No-access : titre et action en copy ; paragraphes inchangés (apostrophes). Answer : fallback erreur défini en copy ; une occurrence peut rester en dur selon encodage.

## 7. Ce qui restera pour la mission suivante

- Remplacer les paragraphes no-access (message, hint) par la copy après normalisation des apostrophes.
- S’assurer que le fallback erreur answer utilise partout copy.submitErrorDefault (vérifier encodage du fichier).
- Corriger les erreurs TypeScript préexistantes du mobile si souhaité.
- Optionnel : empty states avec visuels ou CTAs renforcés.
