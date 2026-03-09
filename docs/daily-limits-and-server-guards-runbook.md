# Runbook — Plafonds journaliers et garde-fous serveur

## 1. Quelles limites existent

- **Par trust_level** (table `trust_daily_limits`) :
  - **max_valid_responses_per_day** : nombre max de réponses enregistrées par jour (UTC).
  - **max_reward_cents_per_day** : plafond de gains (reward_cents) par jour (UTC).
  - **max_withdrawal_requests_per_day** : nombre max de demandes de retrait par jour (UTC).

- Niveaux par défaut (à ajuster en base) :
  - **Bronze** : 10 réponses/jour, 5 €/jour, 1 demande retrait/jour.
  - **Argent** : 20 réponses/jour, 10 €/jour, 2 demandes retrait/jour.
  - **Or** : 50 réponses/jour, 25 €/jour, 3 demandes retrait/jour.

- Le **jour** est le jour calendaire **UTC** (pas de timezone utilisateur). Une seule convention pour tout le pilot.

## 2. Où elles sont appliquées

- **Réponses** : trigger **BEFORE INSERT** sur `responses` (`trg_check_daily_limits_before_response`). Si le user a déjà atteint le nombre max de réponses du jour ou si (gains du jour + reward de la campagne) dépasse le plafond gains, l’insert est refusé avec une exception :
  - `daily_response_count_limit_reached`
  - `daily_reward_limit_reached`
  Aucune ligne insérée, aucun crédit.

- **Demande de retrait** : dans la RPC **request_withdrawal** (après vérification du gel). Si le user a déjà atteint `max_withdrawal_requests_per_day` pour le jour UTC, la RPC retourne `{ error: 'daily_withdrawal_request_limit_reached' }` sans créer de withdrawal.

## 3. Comment les ajuster

- Modifier la table **trust_daily_limits** (Supabase SQL Editor ou migration) :
  - `update trust_daily_limits set max_valid_responses_per_day = 15, max_reward_cents_per_day = 750, updated_at = now() where trust_level = 'Bronze';`
- Ajouter un niveau : `insert into trust_daily_limits (trust_level, max_valid_responses_per_day, max_reward_cents_per_day, max_withdrawal_requests_per_day) values ('Platine', 100, 5000, 5);`
- Les users dont le `trust_level` (table `users`) n’existe pas dans `trust_daily_limits` tombent sur le niveau **Bronze** (fallback).

## 4. Ce que voit le user quand il est limité

- **Réponses** : message propre dans l’écran de réponse (sans stack trace) :
  - « Tu as atteint ta limite de réponses pour aujourd’hui. Reviens plus tard. »
  - « Tu as atteint ton plafond de gains pour aujourd’hui. Reviens plus tard. »

- **Retrait** : dans le wallet, message :
  - « Tu as déjà atteint la limite de demandes de retrait pour aujourd’hui. »

- **Profil** : ligne « Aujourd’hui : X/Y réponses, Z € / W € » pour voir sa consommation du jour.

## 5. Quand un plafond suffit

- Comportement normal : le user est simplement plafonné pour la journée (UTC). Pas de blocage compte, pas de gel. Le lendemain (UTC) les compteurs repartent à zéro.

## 6. Quand passer à un freeze ou une revue fraude

- Si abus suspect (multi-comptes, device partagé, flags ouverts) : utiliser les outils existants (user_risk_controls, gel retraits, revue flags). Les plafonds journaliers **ne remplacent pas** le gel manuel ni la revue. Ils limitent le volume par jour ; la décision de geler ou d’escalader reste humaine (admin).

## 7. Limites connues de cette version

- **Jour UTC** : un user en France verra son « jour » basé sur minuit UTC, pas minuit Paris. À documenter côté produit si besoin.
- **Réponses** : on compte toutes les réponses du jour (y compris celles qui deviendront invalides après le trigger qualité). Le plafond porte sur le nombre d’envois, pas sur le nombre de réponses « valides » a posteriori.
- Pas de scoring anti-fraude ni de blocage automatique basé sur user_devices dans cette mission. Les plafonds sont les seuls garde-fous automatiques côté volume.
