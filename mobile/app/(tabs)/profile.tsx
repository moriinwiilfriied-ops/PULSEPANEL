/**
 * Profile — Trust depuis DB (users.trust_level / users.trust_score).
 * Stats (réponses, gains) et soldes restent du store.
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { useAppStore } from '@/store/useAppStore';
import { isSupabaseConfigured, fetchUserTrust, fetchUserDailyLimitStatus, type UserTrustRow, type UserDailyLimitStatus } from '@/lib/supabaseApi';

function getTrustColor(level: string) {
  switch (level) {
    case 'Or': return '#c9a227';
    case 'Argent': return '#a0a0a0';
    case 'Bronze': return '#cd7f32';
    default: return '#666';
  }
}

/** Niveau affiché : DB si présent et non vide, sinon fallback sobre. */
function getDisplayTrust(trustFromDb: UserTrustRow | null): { label: string; color: string } {
  const level = trustFromDb?.trust_level?.trim();
  if (level) {
    return { label: level, color: getTrustColor(level) };
  }
  return { label: 'En cours de calcul', color: '#666' };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { history, pending, available } = useAppStore();
  const [trustFromDb, setTrustFromDb] = useState<UserTrustRow | null>(null);
  const [dailyStatus, setDailyStatus] = useState<UserDailyLimitStatus | null>(null);

  const loadTrust = useCallback(() => {
    if (!isSupabaseConfigured()) return;
    fetchUserTrust().then(setTrustFromDb);
    fetchUserDailyLimitStatus().then(setDailyStatus);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrust();
    }, [loadTrust])
  );

  const totalResponses = history.length;
  const totalEarnings = history.reduce((sum, h) => sum + h.reward, 0);
  const { label: trustLabel, color: trustColor } = getDisplayTrust(trustFromDb);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.header}>Profil</Text>

      <View style={[styles.trustCard, { borderColor: trustColor }]}>
        <Text style={styles.trustLabel}>Niveau de confiance</Text>
        <Text style={[styles.trustLevel, { color: trustColor }]}>{trustLabel}</Text>
        {trustFromDb?.trust_score != null && (
          <Text style={styles.trustScoreHint}>Score : {trustFromDb.trust_score}</Text>
        )}
        {isSupabaseConfigured() && (
          <Text style={styles.trustSourceHint}>Mis à jour selon la qualité des réponses</Text>
        )}
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalResponses}</Text>
          <Text style={styles.statLabel}>Réponses totales</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalEarnings.toFixed(2)} €</Text>
          <Text style={styles.statLabel}>Gains total</Text>
        </View>
      </View>

      <View style={styles.extra}>
        <Text style={styles.extraLabel}>En attente</Text>
        <Text style={styles.extraValue}>{pending.toFixed(2)} €</Text>
      </View>
      <View style={styles.extra}>
        <Text style={styles.extraLabel}>Disponible</Text>
        <Text style={styles.extraValue}>{available.toFixed(2)} €</Text>
      </View>
      {dailyStatus && (
        <View style={[styles.extra, { marginTop: 16 }]}>
          <Text style={styles.extraLabel}>Aujourd’hui</Text>
          <Text style={styles.extraValue}>
            {dailyStatus.valid_responses_today}/{dailyStatus.max_valid_responses_per_day} réponses, {(dailyStatus.reward_cents_today / 100).toFixed(2)} € / {(dailyStatus.max_reward_cents_per_day / 100).toFixed(2)} €
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  trustCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  trustLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  trustLevel: { fontSize: 28, fontWeight: '700' },
  trustScoreHint: { fontSize: 12, color: '#666', marginTop: 4 },
  trustSourceHint: { fontSize: 11, color: '#999', marginTop: 6 },
  stats: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 20, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 14, color: '#666' },
  extra: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  extraLabel: { fontSize: 16, color: '#666' },
  extraValue: { fontSize: 16, fontWeight: '600' },
});
