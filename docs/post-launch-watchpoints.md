# Watchpoints post-lancement — 48 premières heures

Points à surveiller après le lancement du premier pilote. Pour chaque point : où regarder, seuil d’alerte simple, action immédiate recommandée.

---

## Qualité réponses

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Dashboard → Campagnes → [id] → Qualité campagne (signal, % valides, too_fast, flags) | Signal « Faible » ou &gt; 25 % too_fast ou &gt; 15 % flaggées | Revoir source user ; ouvrir les flags ; décider gel si suspicion fraude. |
| Admin → Campagnes → qualité / réponses | Pic anormal de réponses invalides ou trop rapides | Vérifier une campagne en détail ; flags. |

---

## Vitesse remplissage

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Détail campagne : temps pour atteindre quota (si affiché) ou volume réponses/heure | Remplissage anormalement rapide (&lt; 10 min pour 50+ réponses) sans trafic connu | Vérifier source trafic ; qualité ; risque bot. |
| KPI pilot (home dashboard) | — | Noter pour debrief. |

---

## Flags

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Admin → Flags (liste, ouverts) | Nombre de flags ouverts &gt; 5 ou &gt; 10 % des réponses | Traiter en lot : legit / watch / freeze ; noter motifs. |
| Admin → Flags → [id] (détail) | Flag « Geler retraits » posé | Vérifier user ; confirmer gel côté user detail. |

---

## Shared devices suspects

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Admin → Users (si colonne device / fingerprint) ou données user_devices | Même device_id pour &gt; 3–5 users différents | Enquête manuelle ; possible gel si abus. |
| Runbook : `docs/user-devices-risk-runbook.md` | — | Suivre procédure si disponible. |

---

## Limites journalières touchées anormalement

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Admin → Users → [id] (usage du jour si affiché) | User qui atteint systématiquement la limite (valid responses / reward) très tôt | Comportement attendu ou abus ; vérifier qualité des réponses. |
| Messages côté mobile (limite atteinte) | Beaucoup d’users en erreur « limite atteinte » | Vérifier seuils trust_daily_limits si incohérent. |

---

## Retraits demandés

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Admin → Withdrawals (pending) | Pics de demandes juste après ouverture pilote | Traiter par priorité ; vérifier pas de double compte. |
| Withdrawals rejetés (motif) | Taux rejet élevé sans raison claire | Revoir critères ou message côté user. |

---

## Webhooks

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Admin → Webhooks (liste : statut processed / error / ignored) | processing_status = error sur checkout.session.completed | Vérifier logs Stripe + payload ; corriger webhook ou env. |
| KPI pilot (webhook_errors_24h / 7d) | &gt; 0 erreurs | Ouvrir Admin Webhooks ; traiter cause. |

---

## Écarts ledger

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Admin → Ledger (org_ledger_entries) ; cohérence solde org | Solde org ≠ somme des entrées ledger pour l’org | Runbook ledger ; investigation manuelle. |
| Docs : `docs/billing-ledger-reasons-runbook.md` | — | Procédure audit si écart. |

---

## Confusion dashboard

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Retours entreprise : crédit, campagnes, billing | « Le crédit ne se met pas à jour » / « Je ne vois pas ma campagne » | Vérifier select-org, refresh ; si bug reproduit → P1. |
| Export campagne (CSV/JSON) | Erreur ou export vide alors que réponses présentes | Vérifier droits, détail campagne. |

---

## Confusion wallet

| Où regarder | Seuil alerte | Action |
|-------------|--------------|--------|
| Retours user : pending / available / retrait | « Je n’ai pas reçu mon paiement » | Vérifier withdrawal (pending vs paid) ; délai de traitement ; message clair. |
| Message « Retraits indisponibles » (gel) | User ne comprend pas le gel | Vérifier motif gel ; communiquer si possible. |

---

## Références

- Scénarios : `docs/pilot-critical-scenarios.md`
- Checklist J0 : `docs/launch-day-checklist.md`
- Billing / ledger : `docs/billing-ledger-reasons-runbook.md`
- User devices / risk : `docs/user-devices-risk-runbook.md`
- Flags / gel : `docs/flags-and-withdrawal-freeze-runbook.md`
