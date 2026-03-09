# Mission STRIPE_WEBHOOK_EVENTS_AUDIT_01 — Rapport final

## 1. Vérifications initiales

- **Chemins confirmés**
  - `dashboard/app/api/stripe/webhook/route.ts` — webhook Stripe
  - `dashboard/app/api/stripe/create-checkout/route.ts` — création de session checkout
  - `dashboard/app/admin/webhooks/page.tsx` — page admin webhooks (provisoire basée sur org_topups)
  - `dashboard/src/lib/adminData.ts` — getAdminOrgTopups, getAdminOverviewStats
  - `supabase/migrations/0015_stripe_topups.sql` — table org_topups, RPC org_credit_topup

- **Logique webhook existante confirmée**
  - Vérification signature Stripe (`rawBody`, `stripe-signature`, `constructEvent`)
  - Traitement uniquement de `checkout.session.completed`
  - Insert `org_topups` avec `stripe_checkout_session_id` (unique), `stripe_payment_intent_id`, `org_id`, `amount_cents`
  - Idempotence métier : code 23505 sur insert org_topups → retour 200 sans re-créditer
  - RPC `org_credit_topup` après insert réussi

- **Source actuelle de /admin/webhooks confirmée**
  - `getAdminOrgTopups(100)` — lecture de la table `org_topups` uniquement
  - Bandeau indiquant l’absence de table `webhook_events` et vue provisoire

- **Absence de webhook_events confirmée**
  - Aucune migration ni table `webhook_events` avant cette mission

---

## 2. Choix retenus

- **Structure webhook_events**
  - Table avec `id`, `provider` (default 'stripe'), `event_id`, `event_type`, `livemode`, `api_version`, `created_ts`, `received_at`, `processing_status`, `processing_error`, `processed_at`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `org_id`, `payload_summary` (jsonb), `source_route`, contrainte `unique(provider, event_id)`.
  - Statuts : `received`, `processed`, `ignored`, `error`, `duplicate` (ce dernier prévu en contrainte pour usage futur).

- **Stratégie de logging**
  - Après `constructEvent` réussi uniquement (pas de log si signature invalide — pas d’écriture en base pour des requêtes non authentifiées).
  - Upsert sur `webhook_events` avec `onConflict: 'provider,event_id'` pour ne jamais faire échouer la route en cas de retry Stripe (mise à jour de `received_at`).
  - Pour `checkout.session.completed` : mise à jour de la ligne avec `stripe_checkout_session_id`, `stripe_payment_intent_id`, `org_id` après parsing de la session.
  - Mise à jour du statut en fin de traitement : `processed` / `ignored` / `error` et `processed_at` (et `processing_error` si erreur).

- **Gestion doublons / idempotence**
  - L’idempotence métier reste sur `org_topups` (unique `stripe_checkout_session_id`). En cas de 23505 sur org_topups, on met à jour webhook_events en `processed` et on retourne 200.
  - Les doublons d’event_id Stripe sont gérés par upsert sur webhook_events : pas d’échec, la route continue ; le traitement métier (org_topups) gère son propre 23505.

- **Choix payload brut vs résumé**
  - `payload_summary` (jsonb) uniquement : `{ object_id, type }` pour limiter la taille et éviter tout secret. Pas de stockage du body brut.

---

## 3. Fichiers créés

- `supabase/migrations/0019_webhook_events.sql` — création table `webhook_events`, index, RLS sans policy
- `dashboard/app/admin/webhooks/[id]/page.tsx` — page détail d’un événement webhook (métadonnées, références Stripe, statut, erreur, payload_summary formaté)
- `docs/stripe-webhook-events-audit-report.md` — ce rapport

---

## 4. Fichiers modifiés

- `dashboard/app/api/stripe/webhook/route.ts` — ajout du journal dans `webhook_events` (buildAuditRow, upsert, update des champs Stripe pour checkout.session.completed, update du statut en fin de traitement)
- `dashboard/src/lib/adminData.ts` — `webhookEventsAvailable` via requête sur `webhook_events` ; ajout de `AdminWebhookEventRow`, `getAdminWebhookEvents(filters)`, `getAdminWebhookEventDetail(id)`, `getAdminWebhookStats()`
- `dashboard/app/admin/webhooks/page.tsx` — lecture de `webhook_events` via `getAdminWebhookEvents` et KPIs via `getAdminWebhookStats` ; filtres status / type / search ; tableau avec lien vers détail ; plus de bandeau “provisoire org_topups”
- `dashboard/app/admin/page.tsx` — inchangé (utilise déjà `webhookEventsAvailable` qui est maintenant dérivé de la présence de la table)

---

## 5. Migration et justification

- **Migration 0019_webhook_events.sql**
  - Crée `public.webhook_events` avec les champs listés en 2.
  - Index sur `received_at`, `event_type`, `processing_status`, `stripe_checkout_session_id`, `stripe_payment_intent_id` pour les lectures admin et les jointures futures avec org_topups.
  - RLS activé, aucune policy : accès réservé au service role (webhook + admin dashboard serveur).

---

## 6. Sources de vérité utilisées

- **Crédit org / topups** : inchangées — `org_topups` (idempotence) et `org_credit_topup` restent la source de vérité métier.
- **Audit** : `webhook_events` est une piste d’audit uniquement ; elle ne pilote pas le crédit. La liaison avec les topups se fait via `stripe_checkout_session_id` (présent dans les deux tables).

---

## 7. Gates

- `npx tsc --noEmit` (dashboard) : OK
- Lint ciblé sur les fichiers modifiés : aucune erreur
- Le webhook existant continue de traiter `checkout.session.completed` comme avant ; en cas de retry Stripe, l’upsert sur webhook_events ne casse pas la route et l’idempotence org_topups reste garantie.
- `/admin/webhooks` lit bien `webhook_events` ; la vue provisoire basée uniquement sur org_topups n’est plus la source principale (org_topups reste disponible via `getAdminOrgTopups` si besoin ailleurs).

---

## 8. Diff résumé

- **Migration** : nouvelle table + index + RLS.
- **Webhook** : après validation de la signature, upsert d’une ligne dans webhook_events ; pour checkout.session.completed, mise à jour des IDs Stripe et org_id puis traitement métier inchangé ; en fin de branche, mise à jour de `processing_status` et `processed_at` (et `processing_error` si erreur).
- **Admin** : page webhooks basée sur `getAdminWebhookEvents` + `getAdminWebhookStats` ; page détail par id ; overview détecte la présence de `webhook_events` pour afficher “Table webhook_events disponible”.

---

## 9. Ce qui restera pour la mission suivante

- Replay manuel d’un événement à partir de webhook_events (non implémenté, non requis ici).
- Affichage optionnel d’un lien “Voir le topup” depuis la page détail webhook vers org_topups quand `stripe_checkout_session_id` correspond à un enregistrement (requête ou page dédiée).
- Extension à d’autres types d’événements Stripe si besoin (actuellement seul checkout.session.completed est traité métier ; les autres sont loggés en `ignored`).
