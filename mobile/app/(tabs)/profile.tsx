/**
 * Profile — TrustLevel (Bronze/Argent/Or mock), stats: réponses totales, gains total.
 */

import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { useAppStore } from '@/store/useAppStore';

function getTrustLevel(responsesCount: number): 'Bronze' | 'Argent' | 'Or' {
  if (responsesCount >= 50) return 'Or';
  if (responsesCount >= 20) return 'Argent';
  return 'Bronze';
}

function getTrustColor(level: string) {
  switch (level) {
    case 'Or': return '#c9a227';
    case 'Argent': return '#a0a0a0';
    default: return '#cd7f32';
  }
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { history, pending, available } = useAppStore();
  const totalResponses = history.length;
  const totalEarnings = history.reduce((sum, h) => sum + h.reward, 0);
  const trustLevel = getTrustLevel(totalResponses);
  const color = getTrustColor(trustLevel);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.header}>Profil</Text>

      <View style={[styles.trustCard, { borderColor: color }]}>
        <Text style={styles.trustLabel}>Niveau de confiance</Text>
        <Text style={[styles.trustLevel, { color }]}>{trustLevel}</Text>
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
  stats: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 20, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 14, color: '#666' },
  extra: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  extraLabel: { fontSize: 16, color: '#666' },
  extraValue: { fontSize: 16, fontWeight: '600' },
});
