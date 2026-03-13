# Maestro E2E / Smoke — Parcours économique mobile

Suite smoke ciblée sur le flux critique : bootstrap → feed → wallet.

**CI** : Le workflow GitHub `mobile-quality` exécute typecheck + lint ; il vérifie uniquement que les fichiers de flows existent. L’exécution des flows Maestro (E2E) se fait en local (app + simulateur/émulateur) ou via Maestro Cloud si configuré.

## Prérequis

- [Maestro CLI](https://maestro.mobile.dev/docs/installation) installé (`curl -Ls "https://get.maestro.mobile.dev" | bash`).
- App mobile lancée (ex. `npm run start` puis `i` pour iOS ou `a` pour Android dans le terminal Expo).
- Simulateur/émulateur ou appareil avec l’app ouverte sur l’écran principal (onglet Feed visible après éventuel onboarding).

## Lancer les flows

Depuis le dossier `mobile` :

```bash
maestro test .maestro/flows
```

Pour un seul flow :

```bash
maestro test .maestro/flows/smoke_feed.yaml
```

## Flows disponibles

| Flow | Rôle |
|------|------|
| `smoke_bootstrap.yaml` | Vérifie que l’app est à l’écran (onglet "Feed" visible). |
| `smoke_feed.yaml` | Sur l’onglet Feed, vérifie la présence de l’écran feed (`feed-screen`). |
| `smoke_wallet.yaml` | Ouvre "Portefeuille", vérifie l’écran wallet et le libellé "Disponible". |
| `smoke_answer_real.yaml` | **Parcours answer réel** : Accepter une carte → Answer → première option → Envoyer → écran reward → Retour au feed. Nécessite une campagne test active (voir TESTABILITY.md). |
| `smoke_wallet_withdraw.yaml` | **Optionnel** : Portefeuille → si CTA retrait visible, saisir 5.00 et demander un retrait → vérifier le message de succès. Nécessite solde disponible ≥ 5 €. |
| `smoke_full.yaml` | Enchaîne bootstrap, feed et wallet. |

## AppId

Les flows utilisent `appId: host.exp.Exponent` (Expo Go). Si vous utilisez un build de développement ou une autre variante, adaptez `appId` dans chaque YAML (bundle ID iOS / applicationId Android).

## Contexte testable (parcours answer + retrait réel)

Pour exécuter les flows **answer réel** et **wallet/retrait** :

1. **Backend** : Supabase de dev/test avec `EXPO_PUBLIC_SUPABASE_*` pointant vers ce projet.
2. **Campagne test** : créer depuis le dashboard une campagne **active**, cocher **Test swipe**, avec une question et des options (ex. Oui / Non). Entre deux runs, réinitialiser la campagne (bouton "Réinitialiser" sur la fiche campagne) pour que le feed la propose à nouveau.
3. **Utilisateur** : connecté, onboarding complété, n’ayant pas encore répondu à cette campagne.

Détail : voir `mobile/TESTABILITY.md`.

## Ce qui n’est pas couvert

- **Onboarding** : les flows supposent que l’utilisateur peut atteindre l’onglet Feed.
- **Retrait sans solde** : le flow `smoke_wallet_withdraw` ne s’exécute que si le CTA retrait est visible (solde ≥ 5 € disponible) ; sinon il vérifie seulement l’écran wallet.

## Ancrages (testID)

Éléments utilisés par les tests :

- **Feed** : `feed-screen`, `feed-loading`, `feed-empty`, `feed-accept`
- **Answer** : `answer-screen`, `answer-send`, `answer-reward`, `answer-reward-back`, `answer-option-0`, `answer-option-1`
- **Wallet** : `wallet-screen`, `wallet-withdraw-cta`, `wallet-continue-cta`, `wallet-my-withdrawals`, `wallet-withdraw-section`

Ne pas renommer ces testID sans mettre à jour les flows Maestro concernés.

<!-- trigger mobile quality -->

<!-- force mobile quality rerun -->
