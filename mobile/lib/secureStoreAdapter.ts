/**
 * Adapter storage pour Supabase Auth — expo-secure-store (compatible Expo Go).
 * Clés limitées à [A-Za-z0-9._-] pour éviter "Invalid key" (":" interdit).
 */

import * as SecureStore from 'expo-secure-store';

const PREFIX = 'pp_';
const INVALID_CHARS = /[^A-Za-z0-9._-]/g;

function toStoreKey(key: string): string {
  const raw = String(key ?? '').trim();
  const composed = (PREFIX + (raw || 'empty')).replace(INVALID_CHARS, '_');
  return composed.length ? composed : PREFIX + 'empty';
}

export const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      return (await SecureStore.getItemAsync(toStoreKey(key))) ?? null;
    } catch (err) {
      console.warn('[SecureStore] getItem failed', { key, err });
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(toStoreKey(key), value);
    } catch (err) {
      console.warn('[SecureStore] setItem failed', { key, err });
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(toStoreKey(key));
    } catch (err) {
      console.warn('[SecureStore] removeItem failed', { key, err });
    }
  },
};
