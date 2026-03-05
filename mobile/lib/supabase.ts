/**
 * Client Supabase — Mobile (Expo)
 * Variables: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * persistSession est désactivé pour compatibilité Expo Go (pas de module natif AsyncStorage).
 * La session reste en mémoire le temps de l'app ; on réactivera la persistance via Dev Build plus tard.
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * Assure une session anonyme (pour auth.uid()). À appeler au boot.
 * Activer "Anonymous" dans Supabase Dashboard → Authentication → Providers.
 */
export async function ensureAnonSession(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[Supabase] signInAnonymously failed. Enable Anonymous in Auth providers.', error.message);
  }
}
