# Quickstart seed pilot — PulsePanel

Procédure courte pour lancer le seed pilot, vérifier les données et les utiliser en démo.

---

## 1. Prérequis

- Environnement **staging / dev / pilot** (jamais production).
- Projet Supabase déjà déployé (migrations appliquées).
- Optionnel : Supabase CLI lié au projet pour exécution automatique du SQL.

---

## 2. Lancer le seed

1. Définir les variables d’environnement (anti-prod) :
   - `PILOT_SEED_ENABLED=1`
   - `APP_ENV` différent de `production` (ex. `staging`, `development`, ou non défini).

2. À la racine du repo, en PowerShell :
   ```powershell
   $env:PILOT_SEED_ENABLED = "1"
   $env:APP_ENV = "staging"   # ou development / pilot
   .\scripts\pilot-seed.ps1
   ```
3. Saisir **YES** quand demandé.

4. Si Supabase CLI est absent : le script affiche le chemin du fichier SQL. Ouvrir **Supabase Dashboard → SQL Editor**, coller ou exécuter le contenu de `supabase/seed/pilot_seed.sql`.

---

## 3. Vérifier que le seed est présent

- **Supabase** : Table `orgs` → une ligne avec `name = 'PulsePanel Pilot'`. Table `campaigns` → 5 lignes avec `org_id` = id de cette org et nom commençant par `[Pilot]`.
- **Dashboard** : après avoir associé son compte à l’org pilot (étape 4), aller sur Campagnes → les 5 campagnes [Pilot] apparaissent (en paused).

---

## 4. Associer le compte entreprise de test

Le seed ne crée pas d’utilisateur Auth. Pour voir l’org pilot dans le dashboard :

1. Se connecter au dashboard avec le compte qui doit être owner de l’org pilot.
2. Récupérer son **user id** (Supabase Dashboard → Authentication → Users, ou après login via `supabase.auth.getUser()`).
3. En SQL (Supabase SQL Editor), exécuter :
   ```sql
   insert into public.org_members (org_id, user_id, role)
   values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '<VOTRE_USER_ID>', 'owner')
   on conflict (org_id, user_id) do nothing;
   ```
4. Recharger le dashboard : l’org « PulsePanel Pilot » doit apparaître (sélecteur d’org si multi-org).

---

## 5. Utiliser ces campagnes pour la démo

- **Script démo 10 min** : `docs/demo-script-10min.md`. Optionnel : lancer le seed avant la démo pour avoir 5 campagnes prêtes ; en montrer 1–2, activer une après topup si besoin.
- **Scénarios critiques** : `docs/pilot-critical-scenarios.md`. Les campagnes [Pilot] servent aux scénarios « Création campagne », « Campagnes admin », « Réponse mobile » (activer une campagne puis répondre depuis l’app).
- Crédit org : pour activer une campagne, faire un **topup** (Stripe ou RPC `org_topup_dev` en dev) puis passer la campagne en **active** depuis le dashboard ou l’admin.

---

## 6. Reset propre si besoin

Pour supprimer uniquement l’org pilot et ses campagnes (sans toucher au reste) :

```powershell
$env:PILOT_SEED_ENABLED = "1"
$env:APP_ENV = "staging"
.\scripts\pilot-reset.ps1
```
Saisir **YES**. Ou exécuter manuellement `supabase/seed/pilot_reset.sql` dans le SQL Editor.

---

## 7. Manuel vs automatique

| Action | Automatique (script) | Manuel |
|--------|----------------------|--------|
| Créer org + 5 campagnes | Oui (pilot-seed.ps1 ou SQL) | SQL Editor si pas de CLI |
| Associer compte → org pilot | Non | Oui (insert org_members) |
| Topup org | Non | Billing Stripe ou org_topup_dev |
| Activer une campagne | Non | Dashboard / Admin |
| Users mobiles test | Non | Supabase Auth (créer comptes à la main) |
| Reset org pilot | Oui (pilot-reset.ps1 ou SQL) | SQL Editor |

Dataset complet : `docs/pilot-seed-dataset.md`. KPI minimums : `docs/pilot-kpi-minimum-spec.md`.
