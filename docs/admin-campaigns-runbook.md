# Runbook — Admin Campagnes (global)

Document court pour utiliser la vue admin campagnes cross-org et les actions minimales.

---

## 1. Quand pauser une campagne

- Comportement suspect (trop de réponses trop rapides, abus).
- Demande client / support : « on arrête temporairement ».
- Vérification en cours (qualité, fraude) sans couper définitivement.

**Action :** Admin → Campagnes → ouvrir la campagne → « Mettre en pause ». La campagne ne recevra plus de réponses ; le statut passe à `paused`. Le billing déjà facturé reste inchangé.

---

## 2. Quand reprendre

- Après vérification : la campagne est saine, on la réactive.
- Le client confirme qu’il veut relancer.

**Action :** Depuis le détail campagne admin → « Reprendre ». Le statut repasse à `active`. Pas de double facturation : le trigger de billing ne refacture pas si la campagne était déjà `billed`.

---

## 3. Quand terminer

- La campagne a assez de réponses et on veut la clôturer manuellement.
- Campagne de test ou one-shot à arrêter proprement.
- Éviter de laisser des campagnes actives inutilement.

**Action :** Depuis le détail campagne admin → « Terminer ». Le statut passe à `completed`. Les réponses ne sont plus acceptées. Cohérence quota / billing conservée (pas de remboursement automatique dans cette mission).

---

## 4. Comment lire rapidement les signaux qualité

Sur la page détail campagne admin :

- **Qualité (campaign_quality_stats)** : total_responses, valid_responses, invalid_responses, pct_valid, pct_too_fast, pct_empty.
- **pct_too_fast** élevé → réponses suspectes (temps de réponse &lt; seuil).
- **pct_empty** élevé → réponses vides.
- **pct_valid** bas → combinaison too_fast + empty.

**Flags liés** : nombre de flags (too_fast / empty_answer) sur les réponses de la campagne. Un nombre élevé = campagne à surveiller ou à pauser.

---

## 5. Comment réagir à une campagne douteuse

1. Ouvrir la fiche campagne admin (qualité + flags).
2. Si qualité dégradée ou nombreux flags : **Pause** pour stopper les réponses.
3. Consulter les flags (Admin → Flags) et filtrer / croiser avec la campagne si besoin.
4. Si légitime après vérification : **Reprendre**. Sinon : **Terminer** ou laisser en pause et escalader.

---

## 6. Quand escalader vers remboursement manuel / analyse plus poussée

- **Remboursement** : aucune logique « remboursement campagne » n’est implémentée dans cette mission. Si un client demande un remboursement partiel ou total, traiter manuellement (process interne, Stripe, etc.) et le noter en mission suivante si une fonctionnalité dédiée est prévue.
- **Analyse plus poussée** : export des réponses depuis le **dashboard org** (détail campagne → Export CSV/JSON), réservé aux membres de l’org. L’admin global ne fait pas d’export direct ; il donne le lien vers la campagne et le dashboard org.

---

## Rappels

- Les actions admin (pause / reprendre / terminer) passent par l’API admin et mettent à jour `campaigns.status` via le service role. Aucun impact sur les triggers de coût / billing existants (bill_campaign_on_activate, fill_campaign_costs) au-delà du comportement déjà prévu (ex. passage en active = facturation si unbilled).
- La qualité affichée vient de la vue **campaign_quality_stats** (source de vérité côté DB).
