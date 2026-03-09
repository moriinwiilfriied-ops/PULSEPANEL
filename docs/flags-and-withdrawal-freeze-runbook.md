# Runbook — Flags et gel des retraits (support / fraude)

Document court pour opérer les décisions sur les flags et le gel cashout en pilot réel.

---

## 1. Quand mettre un user sous surveillance (status « watch »)

- Plusieurs flags ouverts sur le même user sans gravité immédiate.
- Comportement limite (réponses trop rapides occasionnelles, réponses vides ponctuelles) sans preuve de fraude.
- Tu veux suivre l’activité sans bloquer les retraits tout de suite.

**Action :** Depuis le détail du flag → « Mettre sous surveillance » + note admin obligatoire (ex. « 3 flags too_fast ce mois, on surveille »).

---

## 2. Quand geler les retraits

- Indices sérieux de fraude ou d’abus (multiples flags sévères, pattern trop_fast + empty_answer répété).
- Demande de vérification manuelle (documents, identité) avant de débloquer.
- Litige ou plainte en cours.
- Décision interne « on ne paie pas ce user tant que X n’est pas résolu ».

**Action :** Depuis le détail du flag → « Geler les retraits du user » avec **motif du gel** et **note admin** obligatoires. Le user ne pourra plus créer de nouvelle demande de retrait tant que le gel est actif.

---

## 3. Quand marquer un flag légitime (status « legit »)

- Après vérification : la réponse trop rapide ou vide avait une raison valable (bug affichage, double-tap, etc.).
- Faux positif du trigger qualité.
- Tu closes le flag sans sanction.

**Action :** Depuis le détail du flag → « Marquer légitime » + note admin (ex. « Vérifié, connexion lente ce jour-là »).

---

## 4. Comment noter une décision

- **Toujours** remplir la note admin pour chaque action (legit, watch, freeze, actioned, dégel).
- Être factuel : date, motif court, qui a décidé si pertinent (ex. « Décision support 2025-03-07, litige en cours »).
- La note est traçable en base (flags.admin_note, user_risk_controls.admin_note) et lisible dans l’admin.

---

## 5. Comment dégeler

- Quand la situation est résolue (vérification faite, litige clos, décision de débloquer).

**Action :**
- Depuis **Admin → Users → [user]** : section « Gel retraits » → « Dégeler les retraits » + note admin obligatoire.
- Ou depuis un **flag** lié à ce user : bouton « Dégeler les retraits » (même API) + note admin.

Après dégel, le user peut à nouveau demander un retrait (sous les règles habituelles de solde et de minimum).

---

## 6. Comment répondre à un user qui demande « pourquoi mon retrait est bloqué ? »

- **Côté app :** le user voit le message sobre : *« Les retraits sont temporairement indisponibles pour ce compte. Contacte le support si nécessaire. »*
- **Côté support :** ne pas exposer les détails internes (flags, motifs de fraude). Réponse type :
  - « Nous avons besoin de vérifier quelques éléments sur ton compte. Un membre de l’équipe te recontactera sous X jours. » ou
  - « Ton compte fait l’objet d’une vérification. Merci de nous avoir contactés ; nous traiterons ta demande dans les délais indiqués. »
- Les motifs et notes sont **uniquement** dans l’admin (table `user_risk_controls`, `flags`) et ne doivent pas être communiqués tels quels au user.

---

## Rappels

- **Gel = effet métier réel** : la RPC `request_withdrawal` refuse toute nouvelle demande si `withdrawals_frozen = true` pour ce user.
- **Traçabilité** : chaque gel/dégel et chaque revue de flag est horodatée et associée à une note admin.
- **Pas de modification par le user** : l’état de gel et les notes sont dans des tables admin-only (RLS, pas de policy publique).
