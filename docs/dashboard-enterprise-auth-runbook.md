# Runbook — Auth dashboard entreprise (PulsePanel)

## 1. Créer / connecter un compte entreprise

- L’utilisateur va sur **/login** et saisit son adresse e-mail.
- Un **magic link** (lien de connexion) est envoyé par Supabase Auth (Email provider).
- L’utilisateur clique sur le lien et arrive sur **/auth/callback**, qui échange le code contre une session et enregistre les cookies.
- Aucun mot de passe : connexion par e-mail uniquement (magic link).

**Prérequis** : Dans Supabase Dashboard → Authentication → Providers, le provider **Email** doit être activé (magic link / OTP selon la config).

---

## 2. Lier le compte à une organisation (pilot)

Aujourd’hui, le lien **user ↔ org** se fait par la table **org_members** en base. Il n’y a pas d’écran d’invitation dans le dashboard.

**Pour donner à un utilisateur l’accès à une org :**

1. Récupérer l’**user_id** Supabase du compte (Auth → Users dans Supabase, ou table `auth.users`).
2. Récupérer l’**org_id** de l’organisation cible (table `public.orgs`).
3. Insérer une ligne dans **org_members** :
   - `org_id` = l’UUID de l’org
   - `user_id` = l’UUID de l’utilisateur
   - `role` = `owner` ou `editor` (owner et editor ont accès au dashboard ; editor peut gérer campagnes/facturation/retraits).

Exemple SQL (à exécuter dans Supabase SQL Editor ou via un outil admin) :

```sql
INSERT INTO public.org_members (org_id, user_id, role)
VALUES (
  'uuid-de-l-org',
  'uuid-du-user',
  'owner'
)
ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;
```

**Qui peut faire ça** : quelqu’un avec accès à la base (Supabase Dashboard, ou admin avec service role). Un futur écran d’invitation pourrait automatiser cela.

---

## 3. Si l’utilisateur voit « Accès non configuré »

Cela signifie : **utilisateur authentifié mais 0 ligne dans org_members** pour son `user_id`.

**À faire :**

1. Vérifier que le compte est bien dans `auth.users` (e-mail cohérent).
2. Vérifier qu’il existe au moins une ligne dans `org_members` pour ce `user_id` avec `role` = `owner` ou `editor`.
3. Si aucune ligne : créer le lien comme au §2 (insert dans `org_members`).
4. L’utilisateur peut ensuite se déconnecter (ou rafraîchir) et revenir sur le dashboard ; le middleware le laissera passer et, s’il n’a qu’une org, il arrivera sur l’accueil.

---

## 4. Multi-org (plusieurs organisations)

Si un utilisateur a **plusieurs** entrées dans `org_members` (plusieurs orgs), au premier accès après login il est redirigé vers **/select-org**.

- Il choisit une organisation dans la liste (uniquement celles où il est owner/editor).
- Son choix est enregistré dans le cookie **pulsepanel_current_org** (validé côté serveur).
- Les pages dashboard (campagnes, facturation, retraits) utilisent cette org comme scope.

Pour **changer d’org** : aller sur **/select-org** (lien possible depuis le header ou la config) et sélectionner une autre org.

---

## 5. Vérifier qu’un compte a bien accès à la bonne org

1. **En base**
   - Table `public.org_members` : une ligne `(org_id, user_id, role)` avec `role` in (`owner`, `editor`) = l’utilisateur a accès à cette org.
2. **Côté app**
   - Se connecter avec ce compte (magic link).
   - Si une seule org : redirection vers `/` (dashboard) avec cette org.
   - Si plusieurs orgs : redirection vers `/select-org` ; après sélection, cookie `pulsepanel_current_org` = org choisie.
3. **Vérification rapide**
   - Aller sur `/billing` ou `/campaigns/new` : les données (crédits, campagnes) doivent être celles de l’org courante. Le header affiche le crédit de l’org sélectionnée.

---

## Rappels

- **/admin** est séparé : protégé par passphrase (`ADMIN_DASHBOARD_PASSPHRASE`), pas par l’auth entreprise.
- En **dev**, optionnel : `DASHBOARD_ALLOW_ANON_DEV=1` permet de garder l’ancien comportement (session anonyme + ensureOrg) pour tester sans magic link. À ne pas utiliser en production.
- Toute résolution d’org (middleware, API set-current-org, pages) est **validée côté serveur** via `org_members` ; un paramètre client non vérifié ne peut pas imposer une org.
