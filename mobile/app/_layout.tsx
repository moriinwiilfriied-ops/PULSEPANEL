import 'react-native-url-polyfill/auto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ensureDeviceRegistered } from '@/lib/deviceRegistration';
import { ensureAnonSession, supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabaseApi';
import { getAppStore } from '@/store/useAppStore';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function parseAgeFromBucket(ageBucket: string | null): number | null {
  if (!ageBucket) return null;
  const s = ageBucket.trim();
  if (s === '45+') return 45;
  const m = s.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) || null : null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureAnonSession();
      if (cancelled || !isSupabaseConfigured()) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || cancelled) return;
      ensureDeviceRegistered().catch(() => {});
      const { data: row } = await supabase
        .from('users')
        .select('age_bucket, region, tags, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled || !row?.onboarding_completed) return;
      const store = getAppStore();
      store.setOnboarding(
        parseAgeFromBucket(row.age_bucket ?? null),
        row.region ?? null,
        Array.isArray(row.tags) ? (row.tags as string[]) : []
      );
      store.completeOnboarding();
      router.replace('/(tabs)/feed');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="answer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
