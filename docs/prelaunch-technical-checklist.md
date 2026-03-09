# Checklist technique pré-lancement

Vérifications minimales avant un vrai pilot. Court. Utile.

---

## 1. Env nécessaires

- [ ] **Dashboard** : `.env.local` (ou `.env`) avec `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ; Stripe si topup : `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, clé secrète côté API.
- [ ] **Mobile** : `.env` avec `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] **Supabase** : projet configuré, migrations appliquées, RLS / policies OK.
- [ ] **Stripe** : webhook configuré (URL dashboard), événements nécessaires (ex. `checkout.session.completed`).

---

## 2. Build dashboard vert

- [ ] À la racine : `.\scripts\prelaunch-dashboard-check.ps1` → PASS (typecheck + next build).
- [ ] Ou dans `dashboard` : `npm run build` → succès.

---

## 3. Mobile démarre

- [ ] `npm run dev:mobile` (ou `npm run start --prefix mobile`) ; QR code ou simulateur OK.

---

## 4. Login org OK

- [ ] Ouvrir `/login` ; saisir un email ; lien magique reçu (ou flow OTP configuré).
- [ ] Après callback : redirection vers `/select-org` ou `/` selon cas.

---

## 5. Select-org / no-access OK

- [ ] `/select-org` : choix d’org si plusieurs ; redirection vers `/` après choix.
- [ ] `/no-access` : affiché si aucune org / pas d’accès ; pas de crash.

---

## 6. Create campaign OK

- [ ] `/campaigns/new` : création campagne (question, options, quota, reward) ; sauvegarde ; redirection détail ou liste.

---

## 7. Billing / topup OK

- [ ] `/billing` : solde, topup Stripe (si clés configurées) ; après paiement test, crédit mis à jour (webhook).

---

## 8. Mobile answer OK

- [ ] Campagne active ; depuis l’app mobile, répondre à une campagne ; réponse enregistrée, visible dans le détail campagne dashboard.

---

## 9. Wallet / retrait OK

- [ ] Côté user (mobile) : demande de retrait si éligible.
- [ ] Côté dashboard `/withdrawals` (entreprise) : N/A ou selon périmètre.
- [ ] Admin : liste retraits, détail, rejet / marquer payé si applicable.

---

## 10. Admin overview OK

- [ ] `/admin` (après login admin) : overview, KPI pilot, liens campagnes / flags / webhooks / withdrawals.

---

## 11. Webhooks / admin lisibles

- [ ] `/admin/webhooks` : liste événements ; détail d’un event lisible.
- [ ] Stripe webhook : au moins un event traité (ex. checkout completed) visible.

---

## 12. Aucun blocker connu ouvert

- [ ] Pas d’erreur bloquante connue sur login, auth callback, select-org, billing, build.
- [ ] Doc : `docs/prelaunch-build-hardening-report.md` pour cause build / corrections ; `docs/pilot-critical-scenarios.md` pour scénarios.

---

## Scripts utiles

- **Gate build** : `.\scripts\prelaunch-dashboard-check.ps1`
- **Smoke pilot** : `.\scripts\pilot-smoke.ps1` (structure, env, routes, docs, typecheck, optionnel build)
- **Quickstart** : `docs/pilot-startup-quickstart.md`
