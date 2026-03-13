/**
 * Notifications — permission et token push.
 * expo-notifications. Gestion propre des erreurs (Expo Go, web).
 */

let notificationsAvailable: boolean | null = null;

async function checkNotificationsAvailable(): Promise<boolean> {
  if (notificationsAvailable !== null) return notificationsAvailable;
  try {
    const mod = await import('expo-notifications');
    notificationsAvailable = !!mod.default;
    return notificationsAvailable;
  } catch {
    notificationsAvailable = false;
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const ok = await checkNotificationsAvailable();
    if (!ok) return false;
    const { requestPermissionsAsync } = await import('expo-notifications');
    const { status } = await requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'unavailable';

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  try {
    const ok = await checkNotificationsAvailable();
    if (!ok) return 'unavailable';
    const { getPermissionsAsync } = await import('expo-notifications');
    const { status } = await getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

const EXPO_PUSH_TOKEN_PREFIX = 'ExponentPushToken[';

export async function getPushToken(): Promise<string | null> {
  try {
    const ok = await checkNotificationsAvailable();
    if (!ok) return null;
    const mod = await import('expo-notifications');
    const token = await mod.getExpoPushTokenAsync?.();
    const raw = token?.data ?? null;
    if (!raw || typeof raw !== 'string' || !raw.startsWith(EXPO_PUSH_TOKEN_PREFIX) || raw.length < EXPO_PUSH_TOKEN_PREFIX.length + 10) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}
