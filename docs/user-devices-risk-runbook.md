# Runbook — User devices et risque fraude

## 1. Ce qu’est réellement un “device” dans cette implémentation

- **Côté app** : une **identité d’installation** (`install_id`) est générée une fois (aléatoire, type UUID), stockée localement (SecureStore) et réutilisée à chaque session.
- **Côté DB** : on ne stocke **jamais** cette valeur en clair. On stocke uniquement un **device_hash** (SHA-256 de l’install_id), avec `user_id`, `platform`, `app_version`, `first_seen_at`, `last_seen_at`.
- Un “device” en base = une ligne `user_devices` = un couple (user_id, device_hash). Si le même téléphone réinstalle l’app, un **nouveau** install_id est généré → nouveau device_hash → nouvelle ligne. Ce n’est donc **pas** un identifiant matériel garanti à vie.

## 2. Ce que ce n’est PAS

- **Pas une preuve absolue d’identité** : le device_hash peut être partagé (même install_id sur plusieurs comptes si quelqu’un clone la donnée, ou famille partageant un téléphone).
- **Pas un hardware fingerprint** : on n’utilise pas d’ID matériel (IMEI, etc.). C’est “cette installation de l’app sur ce téléphone”, stable tant que l’app n’est pas réinstallée / données effacées.
- **Pas une détection magique** : plusieurs comptes sur un même device_hash est un **signal** à interpréter, pas une preuve automatique de fraude.

## 3. Quand considérer un partage device comme suspect

- Un même **device_hash** apparaît pour **plusieurs user_id** (voir section “Devices” sur la fiche user admin, ou “Même device_hash que d’autres comptes”).
- Contexte à prendre en compte : nombre d’autres users (1 = possible partage familial ; 5+ = plus suspect), activité des comptes (retraits, flags), délai entre first_seen des comptes.
- À coupler avec : flags, retraits, trust_score, comportement (réponses trop rapides, etc.). Ne pas décider uniquement sur le device.

## 4. Quand surveiller seulement

- Un user avec 1 device et aucun partage : comportement normal.
- Un user avec 2–3 devices (ex. téléphone + tablette) : possible, à surveiller si d’autres signaux (flags, retraits).
- Premier partage device avec 1 autre user : surveiller ; pas de blocage automatique.

## 5. Quand coupler avec freeze retraits / revue flags

- **Freeze retraits** : décision humaine (admin) après revue. Le device partagé peut être un **élément** du dossier (avec flags, montants, historique).
- **Revue flags** : sur la fiche flag, la section “Devices (user)” et “Ce user partage un device avec d’autres comptes” donne du contexte. Utiliser ça pour prioriser ou pour noter dans admin_note / motif de gel.

## 6. Limites connues

- **Réinstallation app** : nouvel install_id → nouveau device_hash. L’historique “ancien device” reste en base mais n’est plus mis à jour.
- **Changement de téléphone** : nouvel install_id. Un même utilisateur légitime peut donc avoir plusieurs devices.
- **Partage familial** : un device_hash peut légitimement être partagé (ex. un seul téléphone pour plusieurs comptes). Ne pas considérer comme fraude sans autre indice.
- **Clone / export SecureStore** : en théorie quelqu’un pourrait copier l’install_id sur un autre appareil pour “faire croire” au même device. Rare ; le signal reste utile.
- **Pas de lecture client** : la table `user_devices` n’est pas exposée en lecture aux clients (RLS sans policy). Seul l’admin (service role) voit les devices.

---

En résumé : les user_devices donnent une **fondation exploitable** pour la fraude et le support (qui a utilisé quelles installations, partage de device entre comptes). Ce n’est pas une preuve définitive ; les décisions (gel, revue) restent humaines et contextuelles.
