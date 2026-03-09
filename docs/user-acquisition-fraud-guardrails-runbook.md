# Runbook — Recruter proprement sans casser la fraude

Comment acquérir des users pilot utiles tout en gardant la qualité et en évitant la fraude. Court, concret.

---

## 1. Ce qu’on veut vraiment recruter

- **Users réels** : une personne = un compte dans l’idéal.
- **Comportement exploitable** : réponses lisibles, pas de flood too_fast / empty, utilisation normale du wallet (pending → available, retrait dans les clous).
- **Volume maîtrisé** : 200–500 users pour les premiers pilotes, pas 10 000.
- **Sources tracées** : savoir d’où viennent les users pour couper les mauvaises sources. Voir `docs/user-pilot-supply-plan.md`, `docs/user-sources-template.csv`.

---

## 2. Ce qu’on veut éviter

- **Multi-comptes** : une même personne qui crée plusieurs comptes pour maximiser les gains. Signaux : device partagé entre plusieurs user_id, patterns de réponses identiques.
- **Réponses bidon** : clics trop rapides, réponses vides, pour “farm” le reward. Signaux : flags too_fast, empty_answer ; qualité campagne dégradée.
- **Retraits abusifs** : demandes en rafale, montants suspects, litiges. Signaux : withdrawals_frozen, revue flags, admin_note.
- **Messages d’acquisition trompeurs** : “Gagne 500 €”, “Revenu passif” → attirent les fraudeurs et décrédibilisent. Voir `docs/user-recruitment-templates.md` (disclaimer, pas de promesse délirante).

---

## 3. Comment surveiller la qualité des users entrants

- **Par source** : noter dans le pipeline (`docs/user-sources-template.csv`) la source de chaque vague. Après 7–14 j, regarder les users de cette source dans l’admin.
- **Indicateurs** : Admin → Users (trust_level, withdrawals_frozen, nombre de réponses) ; Admin → Flags (filtrer par période, compter par user ou par cohorte) ; Admin → Campaigns → qualité (pct_valid, pct_too_fast, pct_empty) sur les campagnes où la cohorte a répondu.
- **Fréquence** : revue au moins hebdo pendant les phases de recrutement actif. Voir `docs/checklist-user-pilot-quality.md`.

---

## 4. Signaux à regarder

| Signal | Où le voir | Action si anormal |
|--------|------------|-------------------|
| **Flags** (too_fast, empty, etc.) | Admin → Flags | Si taux élevé sur une cohorte → surveiller ou couper la source. |
| **Devices partagés** | Admin → User → section Devices | Si un device_hash lié à beaucoup de user_id → revue manuelle ; possible multi-compte. Voir `docs/user-devices-risk-runbook.md`. |
| **Daily limits touchées** | Comportement user (réponses refusées “limite atteinte”) ; Admin si métriques dispo | Si beaucoup de users “touchent le plafond” dès J1 de façon suspecte → surveiller. Voir `docs/daily-limits-and-server-guards-runbook.md`. |
| **Demandes de retrait anormales** | Admin → Withdrawals | Rafale de demandes, montants incohérents avec l’activité → revue, possible gel. Voir `docs/flags-and-withdrawal-freeze-runbook.md`. |
| **Qualité campagne** | Admin → Campaigns → détail ; bloc Qualité | pct_valid en chute, pct_too_fast ou pct_empty élevé sur une campagne récente → vérifier si une nouvelle source en est la cause. |

---

## 5. Quand juste surveiller

- **Premiers jours** après une nouvelle source : laisser venir, noter le volume, ne pas couper trop tôt.
- **Un ou deux flags** sur un user sans autre indice : surveiller ; pas de gel automatique.
- **Un device partagé entre 2 users** : possible partage familial ; surveiller, pas de blocage sans autre élément (flags, montants).

---

## 6. Quand geler / couper une source

- **Geler un user** : après revue (flags, device, retraits). Décision humaine depuis Admin → Flag ou User ; motif et note admin obligatoires. Voir `docs/flags-and-withdrawal-freeze-runbook.md`.
- **Couper une source** : si la cohorte de cette source a un taux de flags très élevé, ou plusieurs users gelés, ou un pattern devices multi-comptes clair. Marquer la source “Source coupée” dans le pipeline ; ne plus diffuser de contenu sur ce canal. Les users déjà inscrits restent ; on les surveille comme les autres. Voir `docs/checklist-user-pilot-quality.md`.

---

## 7. Ce qu’il ne faut pas promettre dans les messages

- **Pas** : “Gagne 500 € / jour”, “Revenu passif”, “Inscris-toi et reçois 10 €”.
- **Pas** : “Paiement instantané” (les retraits sont traités manuellement).
- **Oui** : “Quelques centimes par réponse”, “Micro-récompenses”, “Tu retires quand tu veux (traitement manuel)”, “Un compte par personne”. Voir `docs/user-recruitment-templates.md`.

---

**Références** : `docs/user-pilot-supply-plan.md`, `docs/user-devices-risk-runbook.md`, `docs/daily-limits-and-server-guards-runbook.md`, `docs/flags-and-withdrawal-freeze-runbook.md`, `docs/checklist-user-pilot-quality.md`.
