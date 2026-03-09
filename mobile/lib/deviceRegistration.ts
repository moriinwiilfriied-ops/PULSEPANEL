/**
 * Enregistrement device côté backend (user_devices).
 * Identité d’installation stable : install_id généré une fois, persisté dans SecureStore.
 * Pas de fingerprint matériel ; on envoie l’install_id à la RPC qui stocke uniquement un hash.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { secureStoreAdapter } from '@/lib/secureStoreAdapter';

const INSTALL_ID_KEY = 'install_id';

function generateInstallId(): string {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let s = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < 32; i++) s += hex[Math.floor(Math.random() * 16)];
  return s;
}

/** Récupère ou crée l’install_id persisté. */
export async function getOrCreateInstallId(): Promise<string> {
  let id = await secureStoreAdapter.getItem(INSTALL_ID_KEY);
  if (id && id.length >= 16) return id;
  id = generateInstallId();
  await secureStoreAdapter.setItem(INSTALL_ID_KEY, id);
  return id;
}

/** Platform courte pour les logs / DB (ios | android | web). */
function getPlatformTag(): string {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/** Version app si disponible (Expo config). */
function getAppVersion(): string | null {
  try {
    const v = Constants.expoConfig?.version ?? (Constants as { manifest?: { version?: string } }).manifest?.version;
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

let lastRegisteredAt = 0;
const MIN_INTERVAL_MS = 60 * 60 * 1000; // 1h entre deux enregistrements pour éviter les appels répétitifs

/**
 * Enregistre ou met à jour le device pour l’utilisateur courant.
 * À appeler après qu’une session Supabase existe (auth.uid() non null).
 * Ne bloque pas l’UI ; échec silencieux ou log discret.
 */
export async function ensureDeviceRegistered(): Promise<void> {
  const now = Date.now();
  if (now - lastRegisteredAt < MIN_INTERVAL_MS) return;
  lastRegisteredAt = now;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    const installToken = await getOrCreateInstallId();
    const platform = getPlatformTag();
    const appVersion = getAppVersion();

    const { error } = await supabase.rpc('register_user_device', {
      _install_token: installToken,
      _platform: platform,
      _app_version: appVersion,
    });

    if (error && __DEV__) {
      console.warn('[deviceRegistration] register_user_device', error.message);
    }
  } catch (e) {
    if (__DEV__) console.warn('[deviceRegistration]', e);
  }
}
