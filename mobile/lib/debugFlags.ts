/**
 * Flags debug UI — Mobile PulsePanel
 * En Expo Go, __DEV__ est généralement true, donc les blocs debug restent visibles.
 * Pour une UI utilisateur propre en phase de test, n'afficher les blocs debug
 * que si EXPO_PUBLIC_SHOW_DEBUG_UI=1 est défini (ex. dans .env).
 */

export const SHOW_DEBUG_UI =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_SHOW_DEBUG_UI === '1';
