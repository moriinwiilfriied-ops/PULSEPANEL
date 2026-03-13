/**
 * Localisation — une fois à la demande (foreground).
 * expo-location. Pas de suivi en arrière-plan.
 */

export interface GeoResult {
  city: string | null;
  department: string | null;
  region: string | null;
}

let locationAvailable: boolean | null = null;

async function checkLocationAvailable(): Promise<boolean> {
  if (locationAvailable !== null) return locationAvailable;
  try {
    const mod = await import('expo-location');
    locationAvailable = !!mod.requestForegroundPermissionsAsync;
    return locationAvailable;
  } catch {
    locationAvailable = false;
    return false;
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const ok = await checkLocationAvailable();
    if (!ok) return false;
    const { requestForegroundPermissionsAsync } = await import('expo-location');
    const { status } = await requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function getCurrentLocationOnce(): Promise<GeoResult> {
  const empty: GeoResult = { city: null, department: null, region: null };
  try {
    const ok = await checkLocationAvailable();
    if (!ok) return empty;
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return empty;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    if (!pos?.coords) return empty;
    const { latitude, longitude } = pos.coords;
    const reversed = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = reversed?.[0] as { city?: string; district?: string; region?: string; subregion?: string } | undefined;
    if (!first) return empty;
    return {
      city: first.city ?? first.subregion ?? null,
      department: first.district ?? null,
      region: first.region ?? null,
    };
  } catch {
    return empty;
  }
}
