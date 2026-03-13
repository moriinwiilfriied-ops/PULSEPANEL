import 'react-native-url-polyfill/auto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { ensureDeviceRegistered } from '@/lib/deviceRegistration';
import { ensureAnonSession, supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabaseApi';
import { getAppStore } from '@/store/useAppStore';
import { colors } from '@/lib/uiTheme';

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

type BootState = 'loading' | 'ready-onboarding' | 'ready-app' | 'error';

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

const BOOT_TIMEOUT_MS = 15000;

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [boot, setBoot] = useState<BootState>('loading');
  const [bootstrapKey, setBootstrapKey] = useState(0);

  const retryBootstrap = useCallback(() => {
    setBoot('loading');
    setBootstrapKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureAnonSession();
        if (cancelled) return;
        if (!isSupabaseConfigured()) {
          getAppStore().clearLocalWalletForNoBackend();
          getAppStore().completeOnboarding();
          setBoot('ready-app');
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id || cancelled) {
          setBoot('error');
          return;
        }
        ensureDeviceRegistered().catch(() => {});
        const { data: row } = await supabase
          .from('users')
          .select('age_bucket, region, tags, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        const completed = !!row?.onboarding_completed;
        if (completed) {
          const store = getAppStore();
          store.setOnboarding(
            parseAgeFromBucket(row?.age_bucket ?? null),
            row?.region ?? null,
            Array.isArray(row?.tags) ? (row.tags as string[]) : []
          );
          store.completeOnboarding();
          setBoot('ready-app');
        } else {
          setBoot('ready-onboarding');
        }
      } catch {
        if (!cancelled) setBoot('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrapKey]);

  // Timeout : ne décide jamais "tabs". Passe en erreur pour permettre un retry.
  useEffect(() => {
    if (boot !== 'loading') return;
    const t = setTimeout(() => setBoot((b) => (b === 'loading' ? 'error' : b)), BOOT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [boot]);

  useEffect(() => {
    if (boot === 'ready-app') router.replace('/(tabs)/feed');
    else if (boot === 'ready-onboarding') router.replace('/onboarding');
  }, [boot, router]);

  if (boot === 'loading') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.bootNeutral} />
      </ThemeProvider>
    );
  }

  if (boot === 'error') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.bootError}>
          <Text style={styles.bootErrorText}>Impossible de charger. Vérifiez votre connexion.</Text>
          <TouchableOpacity style={styles.bootRetryBtn} onPress={retryBootstrap}>
            <Text style={styles.bootRetryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
        initialRouteName={boot === 'ready-app' ? '(tabs)' : 'onboarding'}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="answer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  bootNeutral: { flex: 1, backgroundColor: colors.background },
  bootError: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  bootErrorText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  bootRetryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bootRetryText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
});
