/**
 * Préférences profil — stockage local (AsyncStorage).
 * display_name, notifications, localisation. Pas de backend requis pour la v1.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DISPLAY_NAME = 'profile_display_name';
const KEY_AVATAR_URI = 'profile_avatar_uri';
const KEY_NOTIFICATIONS = 'profile_notifications';
const KEY_LOCATION = 'profile_location';

export interface NotificationPreferences {
  enabled: boolean;
  newCampaigns: boolean;
  walletUpdates: boolean;
  reminders: boolean;
}

export interface LocationPreferences {
  enabled: boolean;
  city: string | null;
  department: string | null;
  region: string | null;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  enabled: false,
  newCampaigns: true,
  walletUpdates: true,
  reminders: false,
};

const DEFAULT_LOCATION: LocationPreferences = {
  enabled: false,
  city: null,
  department: null,
  region: null,
};

export async function getDisplayName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_DISPLAY_NAME);
  } catch {
    return null;
  }
}

export async function setDisplayName(name: string | null): Promise<void> {
  try {
    if (name?.trim()) {
      await AsyncStorage.setItem(KEY_DISPLAY_NAME, name.trim());
    } else {
      await AsyncStorage.removeItem(KEY_DISPLAY_NAME);
    }
  } catch {
    // ignore
  }
}

export async function getAvatarUri(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_AVATAR_URI);
  } catch {
    return null;
  }
}

export async function setAvatarUri(uri: string | null): Promise<void> {
  try {
    if (uri?.trim()) {
      await AsyncStorage.setItem(KEY_AVATAR_URI, uri.trim());
    } else {
      await AsyncStorage.removeItem(KEY_AVATAR_URI);
    }
  } catch {
    // ignore
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY_NOTIFICATIONS);
    if (!raw) return DEFAULT_NOTIFICATIONS;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      enabled: parsed.enabled ?? DEFAULT_NOTIFICATIONS.enabled,
      newCampaigns: parsed.newCampaigns ?? DEFAULT_NOTIFICATIONS.newCampaigns,
      walletUpdates: parsed.walletUpdates ?? DEFAULT_NOTIFICATIONS.walletUpdates,
      reminders: parsed.reminders ?? DEFAULT_NOTIFICATIONS.reminders,
    };
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export async function setNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export async function getLocationPreferences(): Promise<LocationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LOCATION);
    if (!raw) return DEFAULT_LOCATION;
    const parsed = JSON.parse(raw) as Partial<LocationPreferences>;
    return {
      enabled: parsed.enabled ?? false,
      city: parsed.city ?? null,
      department: parsed.department ?? null,
      region: parsed.region ?? null,
    };
  } catch {
    return DEFAULT_LOCATION;
  }
}

export async function setLocationPreferences(prefs: LocationPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_LOCATION, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
