# Mission TRUST_BASED_DAILY_LIMITS_AND_SERVER_GUARDS_01 — Rapport

## 1. Vérifications initiales (ÉTAPE 0)

### Chemins confirmés
- **mobile** : supabaseApi (submitResponseToSupabase, requestWithdrawal, fetchWalletFromSupabase), answer.tsx (handleSend → submitResponseToSupabase), wallet.tsx (withdrawErrorFromApi, requestWithdrawal).
- **supabase** : 0004 handle_response_credit (AFTER INSERT responses), 0006 trg_response_quality (is_valid, flags), 0020 request_withdrawal (gel + insert withdrawals), 0007 withdrawals table.

### Point central de validation réponse confirmé
- **Insert direct** dans `responses` par le client (supabase.from('responses').insert). Trigger **trg_response_credit** (AFTER INSERT) : met reward_cents sur la ligne, crédite user_balances.pending_cents. Aucun RPC actuel.
- **Point d’enforcement retenu** : trigger **BEFORE INSERT** sur `responses` qui vérifie les plafonds journaliers et lève une exception en cas de dépassement → la ligne n’est pas insérée, aucun crédit.

### Sources trust/risk confirmées
- **users.trust_level** (Bronze / Argent / Or, etc.), **users.trust_score**.
- **user_risk_controls** (withdrawals_frozen) déjà utilisé dans request_withdrawal (0020).
- **flags** (qualité too_fast, empty_answer) ; **user_devices** (fondation).

### Points UI error handling confirmés
- **answer.tsx** : `if (error) return;` après submitResponseToSupabase — pas de message affiché aujourd’hui.
- **wallet.tsx** : withdrawErrorFromApi(message) pour minimum_500_cents, insufficient_balance, withdrawals_frozen.

### Limites actuelles
- Aucune limite journalière côté serveur. request_withdrawal vérifie uniquement gel et solde.

---

## 2. Choix retenus

- **Source de vérité** : table **trust_daily_limits** (trust_level, max_valid_responses_per_day, max_reward_cents_per_day, max_withdrawal_requests_per_day). Valeurs initiales : Bronze 10/500/1, Argent 20/1000/2, Or 50/2500/3.
- **Bucket journalier** : **UTC** (jour calendaire `(now() at time zone 'UTC')::date`). Documenté dans la migration et le runbook.
- **Point d’enforcement réponse** : trigger **BEFORE INSERT** sur `responses` (`trg_check_daily_limits_before_response`). Refus par exception `daily_response_count_limit_reached` ou `daily_reward_limit_reached` ; aucune ligne insérée, aucun crédit.
- **request_withdrawal** : garde ajouté au début de la RPC (après gel) : si demandes du jour (UTC) >= max_withdrawal_requests_per_day, retour `{ error: 'daily_withdrawal_request_limit_reached' }`.

## 3. Fichiers créés

- `supabase/migrations/0022_trust_daily_limits_and_guards.sql` (table, get_user_daily_limit_status, get_admin_user_daily_limit_status, trigger, request_withdrawal mis à jour)
- `docs/daily-limits-and-server-guards-runbook.md`
- `docs/daily-limits-mission-report.md` (ce fichier)

## 4. Fichiers modifiés

- `mobile/lib/supabaseApi.ts` : responseLimitErrorToMessage, fetchUserDailyLimitStatus, type UserDailyLimitStatus
- `mobile/app/answer.tsx` : état submitError, affichage message erreur plafond, responseLimitErrorToMessage
- `mobile/app/(tabs)/wallet.tsx` : cas daily_withdrawal_request_limit_reached dans withdrawErrorFromApi
- `mobile/app/(tabs)/profile.tsx` : fetchUserDailyLimitStatus, ligne « Aujourd’hui : X/Y réponses, Z € / W € »
- `dashboard/src/lib/adminData.ts` : AdminUserDailyLimitStatus, daily_limit_status dans getAdminUserDetail (RPC get_admin_user_daily_limit_status)
- `dashboard/app/admin/users/[id]/page.tsx` : section Plafonds du jour (UTC) + pastille « daily limited »

## 5. Migration et justification

- **0022** : trust_daily_limits (source de vérité), RPC get_user_daily_limit_status (auth.uid()) et get_admin_user_daily_limit_status(_user_id) pour service_role, trigger BEFORE INSERT sur responses, request_withdrawal enrichi avec limite demandes/jour. Bucket jour = UTC.

## 6. Sources de vérité

- **Plafonds** : table trust_daily_limits.
- **Usage du jour** : count/sum sur responses et withdrawals avec `(created_at at time zone 'UTC')::date = today_utc`.
- **Niveau user** : users.trust_level (fallback Bronze si absent ou inconnu).

## 7. Gates

- Typecheck dashboard : à exécuter (npx tsc --noEmit).
- Typecheck mobile : erreurs préexistantes possibles hors fichiers touchés.
- Lint : aucun sur les fichiers modifiés.
- Vérifications manuelles : user sous plafond peut répondre ; user au plafond reçoit refus propre sans crédit ; message propre côté mobile ; admin user detail affiche usage et plafonds ; request_withdrawal fonctionne hors cas limité.

## 8. Diff résumé

- Plafonds journaliers par trust_level (table + RPC statut).
- Enforcement réponse : BEFORE INSERT refus si plafond dépassé.
- Limite demandes de retrait/jour dans request_withdrawal.
- Mobile : messages d’erreur structurés, statut du jour en profil.
- Admin : section plafonds du jour sur fiche user + pastille « daily limited ».

## 9. Mission suivante (sans coder ici)

- Ajustement des seuils selon retours pilot.
- Option timezone « jour » (ex. Europe/Paris) si besoin produit.
- Alerte admin si shared_device_users_count élevé + plafond atteint (indice, pas auto-action).
