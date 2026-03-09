# AUDIT AUTH GUARDS — Reality Check 01

**Objectif** : Vérifier factuellement si les guards dashboard/admin sont réellement actifs avec Next.js 16 via `proxy.ts`. Tranchant sur le P0 de l’audit précédent.

**Règles** : Lecture seule, pas de modification de code, preuves obligatoires.

---

## 1. Existence et contenu de `dashboard/proxy.ts`

**Vérification** : Le fichier existe.

- **Chemin** : `c:\Users\morii\Desktop\PulsePanel\dashboard\proxy.ts`
- **Contenu pertinent** :
  - Import `NextResponse`, `NextRequest` depuis `next/server`, `createServerClient` depuis `@supabase/ssr`.
  - Constantes `ADMIN_LOGIN = "/admin/login"`, `ADMIN_PREFIX = "/admin"`.
  - `isDashboardPublicPath(pathname)` : retourne true pour `/login`, `/auth/*`, `/no-access`, `/select-org`.
  - `updateSupabaseSessionAndGuard(request)` : lit la session Supabase ; si chemin public → `NextResponse.next()` ; si pas d’utilisateur (et pas `allowAnonDev`) → redirect `/login` ; si 0 org → redirect `/no-access` ; si plusieurs orgs et cookie org invalide → redirect `/select-org` ; sinon `next()`.
  - Fonction exportée : `export async function proxy(request: NextRequest)` :
    - Si `pathname.startsWith("/admin")` : si `/admin/login` → `next()` ; sinon si `ADMIN_DASHBOARD_PASSPHRASE` non défini → `next()` ; sinon si cookie `pulsepanel_admin_session` ≠ hash du passphrase → redirect `/admin/login` ; sinon `next()`.
    - Sinon : `return updateSupabaseSessionAndGuard(request)`.
  - `export const config = { matcher: ["/admin", "/admin/:path*", "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] }`.

**Preuve** : Lecture directe du fichier `dashboard/proxy.ts` (lignes 1–121).

---

## 2. Type d’export exact

- **Export de la fonction** : **Named export** — `export async function proxy(request: NextRequest)` (l.88–89).
- **Export du config** : **Named export** — `export const config = { ... }` (l.112–117).
- **Pas d’export default** dans le fichier.

**Preuve** : `dashboard/proxy.ts` lignes 88 et 112.

---

## 3. Matcher / config

- **Config** : `export const config = { matcher: [ ... ] }`.
- **Matcher** :
  1. `"/admin"` → requêtes vers `/admin`.
  2. `"/admin/:path*"` → requêtes vers `/admin/*` (users, withdrawals, flags, etc.).
  3. `"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"` → toute requête dont le path ne commence pas par `_next/static`, `_next/image`, `favicon.ico`, ou ne se termine pas par les extensions listées. Donc **toutes les routes applicatives** (/, /login, /billing, /campaigns/new, /campaigns/[id], /withdrawals, /select-org, /no-access, etc.) sont couvertes par ce troisième motif.

**Preuve** : `dashboard/proxy.ts` lignes 112–117.

---

## 4. Position du fichier

- **Emplacement** : `dashboard/proxy.ts`, c’est-à-dire à la **racine du projet dashboard**, au même niveau que le dossier `app/` (structure : `dashboard/app/`, `dashboard/proxy.ts`, `dashboard/next.config.ts`, etc.).
- La doc Next.js 16 exige : *"Create a `proxy.ts` (or `.js`) file in the **project root**, or inside `src` if applicable, so that it is located at the **same level as `pages` or `app`**."*
- Ici le “project root” pour l’app Next est `dashboard/` (c’est le répertoire où se trouvent `package.json` et `next.config.ts`). Donc `proxy.ts` est bien à la racine du projet Next et au même niveau que `app/`.

**Preuve** : Arborescence du repo (glob `dashboard/proxy.*` → seul fichier `dashboard/proxy.ts`), et doc Next.js 16 (middleware renommé en proxy, fichier à la racine au même niveau que `app`).

---

## 5. Comportement attendu selon la doc Next.js 16

- **Doc officielle** (Next.js, “Middleware” → “Migration to Proxy”) :
  - La convention `middleware` est dépréciée et **remplacée par `proxy`**.
  - Il faut créer un fichier **`proxy.ts`** (ou `.js`) à la **racine du projet** (ou dans `src`), au **même niveau que `pages` ou `app`**.
  - Le fichier doit exporter **une seule fonction**, soit en **default export**, soit en **export nommé `proxy`** : *"The file must export a single function, either as a default export or **named `proxy`**."*

- **Projet** :
  - Fichier : `proxy.ts` à la racine de `dashboard/`, même niveau que `app/` → conforme.
  - Export : **named `proxy`** → conforme.
  - Next.js utilisé : **16.1.6** (`dashboard/package.json`).

**Conclusion** : Avec Next.js 16, le fichier `dashboard/proxy.ts` et l’export nommé `proxy` sont **conformes à la convention**. Next.js 16 **charge et exécute ce proxy** pour les requêtes qui matchent `config.matcher`. Les guards sont donc **réellement actifs** dans ce setup.

**Preuve** : Contenu récupéré depuis la doc Next.js (routing/middleware) ; extrait : *"Create a `proxy.ts` (or `.js`) file in the project root... The file must export a single function, either as a default export or named `proxy`."* + `dashboard/package.json` → `"next": "16.1.6"`.

---

## 6. Routes censées être protégées et comportement réel

Comportement déduit du code (sans exécution) :

| Route | Protection attendue | Protection réellement codée dans proxy.ts |
|-------|---------------------|------------------------------------------|
| `/` | Rediriger vers `/login` si non authentifié ; sinon vers `/no-access` ou `/select-org` si besoin. | Matcher 3 → proxy exécuté. Pas chemin public → `updateSupabaseSessionAndGuard`. Si pas user → redirect `/login`. Si user + 0 org → `/no-access`. Si user + multi-org sans cookie valide → `/select-org`. Sinon `next()`. **Conforme.** |
| `/billing` | Idem (auth + org). | Même logique que `/`. **Conforme.** |
| `/campaigns/new` | Idem. | Même logique. **Conforme.** |
| `/campaigns/[id]` | Idem. | Même logique. **Conforme.** |
| `/withdrawals` | Idem. | Même logique. **Conforme.** |
| `/admin` | Rediriger vers `/admin/login` si pas de session admin (cookie passphrase). | Matcher 1 ou 2 → proxy exécuté. pathname.startsWith(ADMIN_PREFIX), pas /admin/login → si `ADMIN_DASHBOARD_PASSPHRASE` défini et cookie ≠ hash → redirect `/admin/login`. **Conforme.** |
| `/admin/login` | Ne pas rediriger (page de login admin). | pathname === ADMIN_LOGIN → `NextResponse.next()`. **Conforme.** |
| `/select-org` | Accessible sans redirection (choix d’org). | Dans `isDashboardPublicPath` → `next()`. **Conforme.** |
| `/no-access` | Accessible (message pas d’accès). | Dans `isDashboardPublicPath` → `next()`. **Conforme.** |

**Redirections codées** (résumé) :

- Non authentifié (et pas `allowAnonDev`) → `/login`.
- Authentifié mais 0 org → `/no-access`.
- Authentifié, plusieurs orgs, cookie org absent ou invalide → `/select-org`.
- Préfixe `/admin` (sauf `/admin/login`), passphrase définie, cookie admin invalide → `/admin/login`.

**Preuve** : `dashboard/proxy.ts` lignes 18–26 (public paths), 49–84 (updateSupabaseSessionAndGuard), 88–110 (proxy).

---

## 7. Verdict

### 7.1 Guards : **ACTIFS**

- Le fichier **`proxy.ts`** est présent à la racine du dashboard, au même niveau que `app/`.
- L’export est un **export nommé `proxy`**, ce qui est **valide et reconnu par Next.js 16** comme proxy global.
- Le **matcher** couvre `/admin`, `/admin/*` et toutes les routes applicatives (/, /billing, /campaigns/*, /withdrawals, etc.) hors assets statiques.
- La **logique** de protection (auth Supabase, org, passphrase admin) et les **redirections** sont implémentées dans ce fichier et s’appliquent bien aux routes listées.

Donc les guards sont **actifs** dans une configuration Next.js 16 standard (fichier bien placé, pas de désactivation dans `next.config.ts`).

---

### 7.2 Tableau récapitulatif

| Route | Protection attendue | Protection réellement codée | Actif (Oui/Non) |
|-------|---------------------|----------------------------|------------------|
| `/` | Auth + org (sinon redirect login / no-access / select-org) | updateSupabaseSessionAndGuard : user, orgIds, cookie org | Oui |
| `/billing` | Idem | Idem | Oui |
| `/campaigns/new` | Idem | Idem | Oui |
| `/campaigns/[id]` | Idem | Idem | Oui |
| `/withdrawals` | Idem | Idem | Oui |
| `/admin` | Session admin (passphrase) sinon redirect /admin/login | Vérif passphrase + cookie pulsepanel_admin_session | Oui |
| `/admin/login` | Pas de redirect (page login) | next() si path === /admin/login | Oui |
| `/select-org` | Accessible (public) | isDashboardPublicPath → next() | Oui |
| `/no-access` | Accessible (public) | isDashboardPublicPath → next() | Oui |

---

### 7.3 P0 de l’audit précédent : **FAUX**

- L’audit précédent (AUDIT_VERITE_TOTALE_PULSEPANEL_01) concluait au **P0** : *"Activer le guard des routes (middleware)"*, en partant du fait qu’il n’y a **pas de `middleware.ts`** et que la logique dans **`proxy.ts`** ne serait **pas exécutée**.
- En **Next.js 16**, la convention officielle est :
  - Fichier **`proxy.ts`** (et non `middleware.ts`) à la racine du projet.
  - Export de la fonction **nommée `proxy`** (ou default), et non obligatoirement “middleware”.
- Le projet utilise **Next.js 16.1.6** et respecte cette convention : **`proxy.ts`** à la racine de `dashboard/` avec **`export async function proxy`**. Next.js 16 charge et exécute ce proxy.
- Donc le P0 qui affirmait que les guards n’étaient pas actifs parce que “aucun middleware.ts n’invoque proxy” est **faux** : avec Next.js 16, **aucun fichier `middleware.ts` n’est requis** ; **`proxy.ts` avec l’export nommé `proxy` suffit** et est bien pris en charge. Les guards sont **déjà actifs**.

---

### 7.4 Risques ou nuances restants

- **Admin désactivé** : Si `ADMIN_DASHBOARD_PASSPHRASE` n’est **pas** défini, le code fait `NextResponse.next()` pour toutes les routes `/admin/*` (l.95–96). Les pages admin sont alors accessibles sans passphrase. C’est **volontaire** (admin “désactivé”), pas un oubli de guard.
- **Mode dev anon** : Si `NODE_ENV === "development"` et `DASHBOARD_ALLOW_ANON_DEV === "1"`, un utilisateur non authentifié n’est pas redirigé vers `/login` (l.53–58). À ne pas activer en production.
- **Aucun autre risque identifié** pour l’activation des guards eux-mêmes ; le seul “risque” résiduel est une mauvaise configuration (passphrase non définie en prod, ou anon dev activé).

---

*Audit en lecture seule ; aucun code modifié.*
