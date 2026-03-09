# Mission USER_DEVICES_FOUNDATION_AND_ADMIN_VISIBILITY_01 — Rapport

## 1. Vérifications initiales (ÉTAPE 0)

### Chemins confirmés
- **mobile** : app/_layout.tsx, (tabs)/feed, wallet, profile, onboarding, answer ; lib/supabase.ts, supabaseApi.ts, secureStoreAdapter.ts (expo-secure-store) ; store/useAppStore.
- **dashboard** : app/admin/users/[id], admin/flags/[id] ; src/lib/adminData (getAdminUserDetail, getAdminFlagDetail).
- **supabase** : migrations 0001–0020 ; 0001_init avec pgcrypto, public.users(id references auth.users).

### Absence réelle de user_devices confirmée
- Aucune occurrence de `user_devices`, `device_hash`, `last_seen_at` dans les migrations.

### Meilleur point d’enregistrement mobile retenu
- **app/_layout.tsx** : après `ensureAnonSession()`, quand `isSupabaseConfigured()` et `user?.id` existent (même bloc que le check onboarding). Appel non bloquant à `ensureDeviceRegistered()` une fois la session prête.

### Libs disponibles confirmées
- **expo-secure-store** : déjà utilisé via secureStoreAdapter (getItem/setItem/removeItem).
- **expo-constants** : présent (Platform / version app si besoin).
- **pgcrypto** : extension déjà créée en 0001_init.sql.

### Stratégie device retenue
- **Identité d’installation** : un `install_id` unique généré une fois (UUID v4), persisté dans SecureStore (clé dédiée). Pas de “hardware fingerprint” magique.
- **Envoi** : le mobile envoie cet `install_id` comme `_install_token` à la RPC.
- **Côté DB** : la RPC calcule `device_hash = encode(digest(_install_token, 'sha256'), 'hex')`, stocke uniquement le hash. Contrainte unique (user_id, device_hash), upsert avec mise à jour de last_seen_at, platform, app_version.

---

## 2. Choix retenus

- **Identité d’installation** : un `install_id` aléatoire (16 bytes hex) généré une fois, persisté dans SecureStore (clé dédiée). Pas de hardware fingerprint ; documenté comme “installation stable” tant que l’app n’est pas réinstallée.
- **Hash** : côté DB uniquement. RPC `register_user_device(_install_token, ...)` reçoit le token, calcule `encode(digest(_install_token, 'sha256'), 'hex')` avec pgcrypto, stocke ce `device_hash`. Aucun stockage du token brut.
- **Moment d’enregistrement** : dans `app/_layout.tsx`, après `ensureAnonSession()` et dès qu’un `user.id` existe ; appel non bloquant `ensureDeviceRegistered().catch(() => {})`. Garde-fou : minimum 1h entre deux appels (lastRegisteredAt) pour éviter les boucles.
- **Admin** : lecture via supabaseAdmin uniquement. `getAdminUserDevices(userId)`, `getAdminSharedDeviceSignals(userId)` ; fiches user et flag enrichies avec liste devices et signaux “même device_hash que d’autres users”.

## 3. Fichiers créés

- `supabase/migrations/0021_user_devices.sql` — table user_devices, RPC register_user_device
- `mobile/lib/deviceRegistration.ts` — getOrCreateInstallId, ensureDeviceRegistered
- `docs/user-devices-risk-runbook.md` — runbook fraude/support
- `docs/user-devices-mission-report.md` — ce rapport

## 4. Fichiers modifiés

- `mobile/app/_layout.tsx` — appel ensureDeviceRegistered() après obtention du user
- `dashboard/src/lib/adminData.ts` — AdminUserDeviceRow, AdminSharedDeviceSignal, getAdminUserDevices, getAdminSharedDeviceSignals ; enrichissement getAdminUserDetail et getAdminFlagDetail
- `dashboard/app/admin/users/[id]/page.tsx` — section Devices + partage device
- `dashboard/app/admin/flags/[id]/page.tsx` — section Devices (user) + indicateur partage

## 5. Migration et justification

- **0021_user_devices.sql** : table avec user_id (auth.users), device_hash, platform, app_version, first_seen_at, last_seen_at ; unique(user_id, device_hash) ; index user_id et device_hash. RLS activé sans policy (accès client refusé). RPC security definer avec auth.uid(), hash via digest(..., 'sha256').

## 6. Sources de vérité

- **Installation** : SecureStore (mobile), clé dédiée.
- **En base** : device_hash (SHA-256 du token), pas de token brut.
- **Lecture** : admin uniquement (service role), pas d’exposition client.

## 7. Gates

- **Typecheck dashboard** : OK.
- **Typecheck mobile** : erreurs préexistantes dans d’autres fichiers (tabs, feed, onboarding) ; les fichiers touchés (deviceRegistration, _layout racine) ne génèrent pas d’erreurs.
- **Lint** : aucun sur les fichiers touchés.
- **Vérifications manuelles** : à faire — app mobile démarre ; user connecté enregistre le device sans doublon ; admin user detail et flag detail affichent devices et partage ; feed / answer / wallet / retraits non cassés.

## 8. Diff résumé

- Fondation user_devices en DB avec hash uniquement, écriture via RPC authentifiée.
- Mobile : install_id stable en SecureStore, enregistrement au boot après session, throttling 1h.
- Admin : visibilité devices et partage device sur fiche user et fiche flag.

## 9. Limites de cette approche

- Réinstallation app → nouvel install_id → nouveau device_hash (pas de lien automatique avec l’ancien).
- Un “device” = une installation logicielle stable, pas un appareil physique garanti.
- Le partage d’un même device_hash entre plusieurs users est un **signal** à interpréter (famille, fraude, etc.), pas une preuve automatique.
- Aucun blocage automatique ni scoring anti-abus dans cette mission.

## 10. Mission suivante (sans coder ici)

- Règles anti-abus optionnelles basées sur device (ex. alerte si N users sur un device_hash).
- Limites journalières ou par device si besoin.
- Amélioration possible du throttling / moment d’enregistrement (ex. au retour premier plan, limité).
