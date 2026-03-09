# Runbook — Retraits manuels PulsePanel

Document opérationnel pour le pilot. À suivre avant de traiter un retrait.

---

## 1. Qui traite les retraits

- Un opérateur ayant accès au **dashboard admin** (`/admin`, protégé par passphrase).
- Les retraits sont visibles dans **Admin → Withdrawals** (liste) et en détail via **Admin → Withdrawals → [id]**.
- Le dashboard métier **/withdrawals** (org) liste aussi les retraits en attente pour les membres org ; le **traitement avec traçabilité** se fait depuis l’admin.

---

## 2. Quand vérifier un retrait

- Consulter régulièrement **Admin → Withdrawals** (filtrer par status = pending).
- Chaque entrée **pending** doit être traitée : soit rejet, soit marquée payée **uniquement après** avoir effectué le virement/paiement externe.

---

## 3. Checklist avant paiement

Avant de cliquer « Marquer payé » :

1. **Virement / paiement externe déjà effectué** (virement bancaire, PayPal, etc.).
2. Vous avez noté la **référence du paiement externe** (n° de virement, ID transaction, etc.).
3. Vous avez identifié le **canal** (virement bancaire, PayPal, autre).
4. Vous avez préparé une **note admin** courte (pourquoi, à quel compte, date du virement si pertinent).

Si l’un de ces points manque, **ne pas** marquer payé. Laisser en **pending** jusqu’à ce que le paiement soit fait et documenté.

---

## 4. Comment effectuer le paiement externe

- **Hors application** : virement bancaire, PayPal, autre moyen choisi par l’équipe.
- Récupérer les coordonnées de paiement du participant si besoin (process interne : email, formulaire, etc.).
- Effectuer le virement depuis le compte / outil de l’entreprise.
- Conserver une preuve (capture, reçu, n° d’opération) en interne.

---

## 5. Quand cliquer « Marquer payé »

- **Uniquement après** que le virement / paiement a été effectué et que vous avez la référence sous la main.
- Remplir obligatoirement :
  - **Référence externe** (n° virement, ID transaction, etc.)
  - **Canal** (virement bancaire / PayPal / autre)
  - **Note admin** (courte description)
- Cocher la case de confirmation : « Je confirme que le paiement externe a déjà été effectué. »
- Cliquer « Marquer payé ».

Si vous cliquez « Marquer payé » sans avoir payé, vous créez une incohérence (état paid sans argent envoyé). **À ne jamais faire.**

---

## 6. Comment rejeter

- Ouvrir le retrait en **Admin → Withdrawals → [id]**.
- Choisir **Rejeter**.
- Renseigner obligatoirement le **motif de rejet** (raison courte, lisible).
- Ajouter une **note admin** si utile.
- Valider. Le montant est **remboursé** sur le solde disponible du participant.

---

## 7. Quelle trace conserver

- **Côté système** : pour chaque décision (paid ou rejected), l’admin enregistre :
  - **paid** : référence externe, canal, note admin, date de décision.
  - **rejected** : motif de rejet, note admin, date de décision.
- **Côté opération** : conserver en interne la preuve du virement (reçu, capture) pour les litiges.

---

## 8. Litige « Je n’ai rien reçu »

1. Vérifier dans **Admin → Withdrawals** le retrait : status **paid**, **référence externe** et **note admin**.
2. Contrôler en interne que le virement a bien été fait (reçu, compte, montant).
3. Si le virement est confirmé côté entreprise : répondre au participant avec la référence du virement et la date.
4. Si erreur (mauvais compte, non envoyé) : traiter en interne (nouveau virement, procédure erreur). Ne pas changer rétroactivement le statut du retrait dans l’app sans processus défini.

---

## 9. Règle d’or

**« Paid » = l’argent a déjà été envoyé hors application.**

- Pas « on paiera plus tard ».
- Pas « validé visuellement » sans virement.
- Si le virement n’est pas fait, le retrait reste **pending**.

---

## Liens utiles

- **Admin** : `/admin` (après connexion passphrase).
- **Liste retraits admin** : `/admin/withdrawals`.
- **Détail d’un retrait** : `/admin/withdrawals/[id]`.
- **Export CSV** : depuis la page `/admin/withdrawals` (bouton Export CSV).
