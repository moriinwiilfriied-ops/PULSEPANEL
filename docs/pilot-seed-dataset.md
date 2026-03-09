# Dataset seed pilot — PulsePanel

Source de vérité du dataset de démo / pilot : org, campagnes, usage prévu. Pas de données réelles métier ; démo et tests uniquement.

---

## 1. Org de seed / pilot

| Attribut | Valeur |
|----------|--------|
| **Nom** | PulsePanel Pilot |
| **Usage** | Org dédiée démo et pilot ; ne pas utiliser en prod. |
| **Identification** | Nom exact `PulsePanel Pilot` ; id fixe en seed pour reproductibilité. |

Après le seed : associer manuellement le compte entreprise de test (voir `docs/pilot-seed-quickstart.md`).

---

## 2. Campagnes de démo (3 à 5)

Toutes en **status = paused** à l’insert pour éviter tout débit automatique. Activation manuelle après topup si besoin.

Convention de nommage : préfixe **`[Pilot]`** pour repérer les campagnes seed dans l’admin.

| # | Nom seed | Packaging / type | Slogan / concept | Pricing (reward) | Objectif démo |
|---|----------|------------------|------------------|------------------|----------------|
| 1 | [Pilot] A/B Packaging | A/B Test (2 options visuel) | Choix visuel A vs B | 20 ct/réponse, quota 100 | Montrer template A/B, quota, coût |
| 2 | [Pilot] Price Test | Price test (4 paliers) | Consentement à payer | 25 ct/réponse, quota 100 | Montrer pricing, courbe prix |
| 3 | [Pilot] Slogan Test | Slogan (3 options) | Préférence slogan | 20 ct/réponse, quota 80 | Montrer slogan, options multiples |
| 4 | [Pilot] Concept Test | Concept (2 concepts) | Envie d’achat | 20 ct/réponse, quota 80 | Montrer concept test |
| 5 | [Pilot] NPS rapide | NPS 0–10 | Recommandation produit | 15 ct/réponse, quota 50 | Montrer NPS (si template supporté) |

Détail par campagne (question, options, quota, reward_cents) : défini dans `supabase/seed/pilot_seed.sql`.

---

## 3. Users test / pilot

- **Création** : aucun user Auth créé par le seed (pas de service Auth depuis le repo).
- **Nombre** : 1 à 3 comptes de test suffisants pour démo et scénarios critiques.
- **Rôle** : compte entreprise = owner de l’org pilot (à lier après seed). Comptes mobiles = users Supabase Auth créés à la main (Dashboard Auth ou script) pour feed / réponses / wallet / retrait.
- **Réalisme** : profils minimaux (email test, pas de données sensibles). Rattachement à l’org pilot documenté dans le quickstart.

---

## 4. Ce qui est seed « démo » vs créé en vrai

| Seed (automatique) | Manuel / pendant le pilot |
|--------------------|---------------------------|
| Org « PulsePanel Pilot » | Lier son compte à cette org (org_members) |
| 5 campagnes [Pilot] en paused | Topup org (Stripe ou org_topup_dev) ; activer 1–2 campagnes |
| (optionnel) Crédit dev via org_topup_dev | Réponses réelles, retraits, flags, revues admin |

Aucune réponse, aucun retrait, aucun flag n’est seedé ; les scénarios critiques s’exécutent avec des actions réelles après seed.
