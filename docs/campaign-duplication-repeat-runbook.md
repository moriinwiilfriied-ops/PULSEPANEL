# Runbook — Duplication campagne et repeat

Court guide pour dupliquer une campagne (V2, relance) et l’utiliser dans le pilot.

---

## 1. Quand dupliquer une campagne

- **Premier test réussi** : vous avez terminé une campagne, les réponses sont correctes → vous voulez relancer un test similaire (même question, quota, récompense) ou une variante.
- **Version 2** : lancer une nouvelle vague avec les mêmes paramètres, éventuellement après avoir ajusté le ciblage ou le quota.
- **Test A/B** : dupliquer puis modifier la question ou les options pour comparer (ex. « Créer variante A/B » dans le détail campagne).

---

## 2. Ce qui est repris

Lors de la duplication, sont copiés :

- **Nom** (avec suffixe « — V2 » ou personnalisé)
- **Template** et **template_key** / **template_version**
- **Question** et **options**
- **Ciblage** (targeting : âge, régions, tags)
- **Quota**, **reward_cents**, **price_cents**

La nouvelle campagne est créée **en brouillon (paused)** : pas de facturation, pas de lancement automatique.

---

## 3. Ce qui ne l’est pas

- **Réponses** : aucune réponse n’est copiée.
- **Flags**, **coûts réalisés**, **ledger** : rien de l’historique financier ou modération.
- **Statut actif** : la copie est toujours en **paused** ; vous décidez de publier après relecture.
- **ID**, **dates**, **responses_count** : recalculés pour la nouvelle campagne.

---

## 4. Lancer une V2 proprement

1. Sur la page **détail campagne** (terminée ou en pause), cliquer sur **« Créer une V2 »**.
2. Vous êtes redirigé vers le **détail de la copie** (en brouillon).
3. Vérifier le nom, la question, le quota, la récompense. Modifier le statut (Publier / Terminer) ou les champs si besoin — aujourd’hui les champs se modifient côté DB uniquement via édition manuelle ou en recréant ; le flow standard est « relire puis publier ».
4. Si le **crédit org** est suffisant, cliquer sur **Publier** pour passer la campagne en **active** (facturation à ce moment-là).
5. Si le crédit est insuffisant, recharger via **Billing** puis revenir sur la campagne et publier.

Aucun lancement automatique : la copie ne devient active que lorsque vous cliquez sur Publier.

---

## 5. Utilisation commerciale après un premier test réussi

- Utiliser la **V2** pour enchaîner un deuxième test sans ressaisir toute la config.
- Le **repeat entreprise** (org qui lance au moins 2 campagnes) est mesuré via les KPI pilot ; les campagnes créées par duplication sont comptées comme des campagnes à part entière.
- Si besoin de preuve pour un client : export CSV / JSON de la campagne d’origine, puis lancer la V2 et exporter ses résultats à part — la duplication ne mélange pas les données.

---

**Références** : `docs/repeat-enterprise-definition.md`, `docs/pilot-kpi-minimum-spec.md`.
