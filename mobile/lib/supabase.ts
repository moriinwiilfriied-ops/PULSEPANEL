/**
 * Client Supabase — Mobile (Expo)
 * Variables: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
 * Session persistée via expo-secure-store (compatible Expo Go).
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureStoreAdapter } from '@/lib/secureStoreAdapter';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, anonKey, {
  auth: url
    ? {
        storage: secureStoreAdapter,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      }
    : {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
});

/**
 * Assure une session anonyme (pour auth.uid()). À appeler au boot.
 * D'abord getSession(); si pas de session => signInAnonymously().
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
