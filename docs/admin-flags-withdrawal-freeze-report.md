# Mission ADMIN_FLAGS_TRIAGE_AND_WITHDRAWAL_FREEZE_01 — Rapport final

## 1. Vérifications initiales

- **Chemins confirmés**
  - `dashboard/app/admin/flags/page.tsx`, `dashboard/app/admin/users/page.tsx`, `dashboard/app/admin/withdrawals/[id]`
  - `dashboard/src/lib/adminData.ts` (getAdminFlags, getAdminUsers, getAdminWithdrawalDetail)
  - `dashboard/src/lib/adminAuth.ts`, `dashboard/app/api/admin/withdrawals/[id]/decide/route.ts`
  - `mobile/app/(tabs)/wallet.tsx`, `mobile/lib/supabaseApi.ts` (requestWithdrawal, fetchMyWithdrawals)
  - `supabase/migrations/0001_init.sql` (flags, users), `0006_quality_flags.sql` (trigger flags), `0007_withdrawals.sql` (request_withdrawal)

- **Structure flags confirmée**
  - Table `flags` : id, user_id, response_id, reason, severity, status, created_at (0001). Trigger 0006 insère status `open`, reasons `too_fast` / `empty_answer`. Aucune colonne admin_note / reviewed_at / reviewed_by avant cette mission.

- **Structure withdrawals confirmée**
  - Table `withdrawals`, RPC `request_withdrawal` (vérifie auth, montant min 500, solde, insert withdrawal + update user_balances + ledger). Pas de vérification de gel.

- **Capacité actuelle de gel confirmée ou absente**
  - **Absente** : aucune table ni logique pour geler les retraits d’un user. Aucune référence à freeze/frozen/suspend/ban dans le code métier ou les migrations.

- **Meilleur endroit de stockage admin-only retenu**
  - **Table dédiée `user_risk_controls`** (1 ligne par user) : user_id (PK), withdrawals_frozen, withdrawals_frozen_reason, withdrawals_frozen_at, withdrawals_frozen_by, admin_note, updated_at. RLS activé, **aucune policy** → accès service_role uniquement. Choix retenu pour ne pas stocker d’état sensible dans `users` (policy « update own » permettrait à l’utilisateur de le modifier).

---

## 2. Choix retenus

- **Table admin-only**
  - `user_risk_controls` : une ligne par user, clé primaire user_id. Permet gel/dégel traçable (motif, date, « par qui ») sans toucher à `users`. Pas de système de bannissement global.

- **Stratégie de revue flags**
  - Colonnes ajoutées sur `flags` : `admin_note`, `reviewed_at`, `reviewed_by`. Statuts utilisés : `open` (existant), `legit`, `watch`, `actioned` (sans contrainte CHECK pour rester compatible). Actions : Marquer légitime, Mettre sous surveillance, Geler les retraits (met aussi le flag en `actioned`).

- **Point exact où le gel est appliqué**
  - Dans la RPC **`request_withdrawal`** (migration 0020) : après vérification de `auth.uid()`, lecture de `user_risk_controls` pour ce user ; si `withdrawals_frozen = true`, retour immédiat `jsonb_build_object('error', 'withdrawals_frozen')` sans créer de withdrawal ni modifier les soldes.

---

## 3. Fichiers créés

- `supabase/migrations/0020_user_risk_controls_and_flag_review.sql` — table user_risk_controls, colonnes flags (admin_note, reviewed_at, reviewed_by), remplacement request_withdrawal avec check gel
- `dashboard/app/api/admin/flags/[id]/review/route.ts` — POST revue de flag (legit / watch / actioned / freeze)
- `dashboard/app/api/admin/users/[id]/freeze/route.ts` — POST gel/dégel retraits
- `dashboard/app/admin/flags/[id]/page.tsx` — détail flag + contexte user + état gel
- `dashboard/app/admin/flags/[id]/FlagDetailActions.tsx` — client : actions Marquer légitime, Watch, Geler, Dégeler
- `dashboard/app/admin/users/[id]/page.tsx` — détail user (trust, soldes, risk_control, liens)
- `dashboard/app/admin/users/[id]/UserFreezeActions.tsx` — client : Geler / Dégeler retraits
- `docs/flags-and-withdrawal-freeze-runbook.md` — runbook support/fraude
- `docs/admin-flags-withdrawal-freeze-report.md` — ce rapport

---

## 4. Fichiers modifiés

- `dashboard/src/lib/adminData.ts` — AdminUserRow + withdrawals_frozen / withdrawals_frozen_reason ; getAdminUsers lit user_risk_controls ; AdminFlagRow + admin_note, reviewed_at, reviewed_by, user_withdrawals_frozen ; getAdminFlags(filters) avec status/severity/search_user_id et jointure frozen ; getAdminFlagDetail(id) ; getAdminUserRiskControl, getAdminUserDetail
- `dashboard/app/admin/flags/page.tsx` — filtres (status, severity, search_user_id), colonnes admin_note et cashout (frozen/—), lien id → détail, lien user_id → détail user
- `dashboard/app/admin/users/page.tsx` — colonnes cashout (active/frozen) et frozen_reason, lien user_id → /admin/users/[id]
- `mobile/app/(tabs)/wallet.tsx` — withdrawErrorFromApi : cas `withdrawals_frozen` → message sobre « Les retraits sont temporairement indisponibles… »

---

## 5. Migration et justification

- **0020_user_risk_controls_and_flag_review.sql**
  - Crée `user_risk_controls` (PK user_id, withdrawals_frozen, motif, dates, admin_note), index partiel sur withdrawals_frozen, RLS sans policy.
  - Ajoute sur `flags` : admin_note, reviewed_at, reviewed_by.
  - Remplace `request_withdrawal` : après auth, si une ligne existe pour ce user avec withdrawals_frozen = true, retourne `{ error: 'withdrawals_frozen' }` sans rien écrire ; sinon comportement inchangé (vérif montant, solde, insert withdrawal, update balances, ledger).

---

## 6. Sources de vérité utilisées

- **Gel retraits** : `user_risk_controls` (withdrawals_frozen, motif, dates). Lecture/écriture uniquement via service_role (admin dashboard + API routes protégées par getAdminSession).
- **Revue flags** : `flags` (status, admin_note, reviewed_at, reviewed_by). Mise à jour via API /admin/flags/[id]/review.
- **Demande de retrait** : `request_withdrawal` lit `user_risk_controls` en premier ; la création de withdrawal reste conditionnée au solde et aux règles existantes.

---

## 7. Gates

- **Typecheck dashboard** : OK.
- **Typecheck mobile** : erreurs préexistantes dans d’autres fichiers ; `wallet.tsx` modifié ne rajoute pas d’erreur.
- **Lint** (fichiers touchés) : aucune erreur.
- **User non gelé** : peut toujours appeler request_withdrawal ; si solde et montant OK, withdrawal créé (comportement inchangé).
- **User gelé** : request_withdrawal retourne `{ error: 'withdrawals_frozen' }` ; le mobile affiche le message prévu.
- **Admin** : liste flags affiche colonne cashout (frozen/—) et lien détail ; liste users affiche cashout (active/frozen) et frozen_reason ; détail flag et détail user affichent l’état de gel et permettent gel/dégeler avec note.

---

## 8. Diff résumé

- **DB** : nouvelle table user_risk_controls, colonnes revue sur flags, request_withdrawal qui refuse si gel.
- **Admin** : revue de flag (legit / watch / actioned / freeze) avec note ; gel/dégel user avec motif et note ; listes flags/users avec filtres et état cashout ; pages détail flag et user avec actions.
- **Mobile** : message d’erreur dédié pour withdrawals_frozen.

---

## 9. Ce qui restera pour la mission suivante

- Identifier l’admin (reviewed_by / withdrawals_frozen_by) par un vrai identifiant si une auth admin utilisateur existe plus tard.
- Optionnel : alerte ou badge « user gelé » sur la fiche retrait dans l’admin.
- Pas de user_devices, pas de Stripe Connect, pas de refonte mobile dans le périmètre de cette mission.
