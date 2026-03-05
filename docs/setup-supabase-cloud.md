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

## 3. Exécuter la migration SQL

1. Dans le **Supabase Dashboard**, ouvrez **SQL Editor**.
2. Créez une nouvelle requête et collez le contenu du fichier **`supabase/migrations/0001_init.sql`** (à la racine du repo).
3. Exécutez la requête (Run). Les tables `users`, `campaigns`, `responses`, `user_balances`, `ledger_entries`, `flags` sont créées, avec les index, le trigger et les policies RLS.

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
  - **Dashboard** : liste et création de campagnes dans Supabase ; détail campagne avec réponses Supabase (fallback mock si erreur).
  - **Mobile** : onboarding upsert dans `public.users` ; feed chargé depuis `public.campaigns` (status = `active`) ; envoi des réponses dans `public.responses` ; wallet reste en mock local (pending/disponible).

Aucune clé secrète ne doit être commitée : utilisez uniquement **Project URL** et **anon key** dans les fichiers d’env ci-dessus.
