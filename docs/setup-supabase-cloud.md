# Configuration Supabase (Cloud) — PulsePanel

Ce guide décrit comment brancher le projet sur un projet Supabase Cloud (sans casser l’UI mock : en l’absence de clés, le mock reste utilisé).

---

## 1. Où trouver les clés Supabase

1. Allez sur [supabase.com](https://supabase.com) et connectez-vous.
2. Ouvrez votre **projet** (ou créez-en un).
3. **Project URL** et **Publishable key (anon)** :
   - Menu **Project Settings** (icône engrenage).
   - Onglet **API**.
   - Vous y trouverez :
     - **Project URL** (ex. `https://xxxxx.supabase.co`)
     - **Project API keys** → **anon public** (clé publique, safe pour le client).

Ne commitez **jamais** la clé **service_role** (secrète). Seules **Project URL** et **anon key** sont nécessaires pour Mobile et Dashboard.

---

## 2. Où coller les clés

### Mobile (Expo)

Créez un fichier **`mobile/.env`** (il est ignoré par git) :

```env
EXPO_PUBLIC_SUPABASE_URL=https://VOTRE_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key_ici
```

Les variables `EXPO_PUBLIC_*` sont exposées au client (c’est voulu pour l’anon key).

### Dashboard (Next.js)

Créez un fichier **`dashboard/.env.local`** :

```env
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key_ici
```

---

## 3. Exécuter les migrations SQL

1. Dans le **Supabase Dashboard**, ouvrez **SQL Editor**.
2. **Migration 1** : créez une requête et collez **`supabase/migrations/0001_init.sql`**. Exécutez (Run). Tables : `users`, `campaigns`, `responses`, `user_balances`, `ledger_entries`, `flags` + RLS.
3. **Migration 2 (multi-tenant)** : nouvelle requête, collez **`supabase/migrations/0002_orgs.sql`**. Exécutez (Run). Tables : `orgs`, `org_members` ; colonne `org_id` sur `campaigns` ; policies RLS mises à jour (chaque org ne voit que ses campagnes ; le feed mobile reste public pour les campagnes `status = 'active'`).

---

## 4. Activer l’auth anonyme

Pour que Mobile et Dashboard puissent appeler `signInAnonymously()` (et obtenir un `auth.uid()` pour les policies RLS) :

1. Supabase Dashboard → **Authentication** → **Providers**.
2. Trouvez **Anonymous** et activez-le (Enable).
3. Si `signInAnonymously` échoue, vérifiez que ce provider est bien activé et que la migration a été exécutée.

---

## 5. Relancer les apps

- **Mobile** : à la racine du repo, `npm run dev:mobile` (ou dans `mobile/` : `npm run start`). Puis ouvrir dans Expo Go. Redémarrez après avoir ajouté ou modifié `mobile/.env`.
- **Dashboard** : `npm run dev:dashboard` (ou dans `dashboard/` : `npm run dev`). Ouvrir `http://localhost:3000`. Redémarrez après avoir ajouté ou modifié `dashboard/.env.local`.

---

## 6. Comportement attendu

- **Sans clés** (pas de `.env` / `.env.local`) : tout reste en mock (campagnes et réponses en mémoire, pas d’appel Supabase).
- **Avec clés** :
  - **Dashboard (multi-tenant)** : à la première visite, une org par défaut **« PulsePanel (demo) »** est créée et l’utilisateur anonyme en devient owner. La liste des campagnes et la création ne concernent que **cette org** (chaque org ne voit que ses campagnes et réponses). Détail campagne avec réponses de l’org (fallback mock si erreur).
  - **Mobile** : onboarding upsert dans `public.users` ; feed chargé depuis `public.campaigns` où `status = 'active'` (toutes les campagnes actives, sans filtre org) ; envoi des réponses dans `public.responses` ; wallet reste en mock local (pending/disponible).

Aucune clé secrète ne doit être commitée : utilisez uniquement **Project URL** et **anon key** dans les fichiers d’env ci-dessus.

---

## 7. Notion d’organisation (org)

À partir de la migration **0002_orgs.sql** :

- Chaque **organisation** (`public.orgs`) a des **membres** (`public.org_members`) avec un rôle (`owner`, `editor`).
- Les **campagnes** sont rattachées à une org (`campaigns.org_id`). Seuls les membres de cette org peuvent les créer, modifier, supprimer et voir les réponses.
- Le **dashboard** : au premier chargement (après auth anonyme), si l’utilisateur n’a aucune org, une org **« PulsePanel (demo) »** est créée et il en devient owner. Toutes les campagnes créées depuis le dashboard sont associées à cette org.
- Le **mobile** : ne filtre pas par org ; il affiche toutes les campagnes actives dans le feed. Les réponses sont insérées avec `user_id = auth.uid()` ; l’utilisateur ne voit pas les réponses des autres, seul le dashboard (membre de l’org de la campagne) peut voir les réponses de ses campagnes.
