/**
 * Wallet — Pending, Disponible, total, historique.
 * Action DEV "Simuler validation" : transfère une partie pending → disponible.
 */

import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { useAppStore } from '@/store/useAppStore';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { pending, available, history, simulateValidation, validateAllPending } = useAppStore();
  const [devAmount, setDevAmount] = useState('');

  const total = pending + available;

  const handleSimulate = () => {
    const amount = parseFloat(devAmount.replace(',', '.'));
    if (!Number.isNaN(amount) && amount > 0) {
      simulateValidation(amount);
      setDevAmount('');
    } else {
      validateAllPending();
      setDevAmount('');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 24 }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={styles.header}>Wallet</Text>

      <View style={styles.cards}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>En attente</Text>
          <Text style={styles.cardValue}>{pending.toFixed(2)} €</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Disponible</Text>
          <Text style={[styles.cardValue, styles.cardValueGreen]}>{available.toFixed(2)} €</Text>
        </View>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{total.toFixed(2)} €</Text>
      </View>

      <View style={styles.devSection}>
        <Text style={styles.devTitle}>DEV — Simuler validation</Text>
        <TextInput
          style={styles.devInput}
          value={devAmount}
          onChangeText={setDevAmount}
          placeholder="Montant (vide = tout)"
          placeholderTextColor="#888"
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={styles.devBtn} onPress={handleSimulate}>
          <Text style={styles.devBtnText}>Transférer pending → disponible</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.historyTitle}>Historique</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>Aucune réponse encore.</Text>
      ) : (
        history.map((entry) => (
          <View key={entry.id} style={styles.historyRow}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyQuestion} numberOfLines={1}>{entry.questionTitle}</Text>
              <Text style={styles.historyAnswer} numberOfLines={1}>{entry.answer}</Text>
            </View>
            <View style={styles.historyRight}>
              <Text style={styles.historyReward}>+{entry.reward.toFixed(2)} €</Text>
              <View style={[styles.badge, entry.status === 'available' ? styles.badgeOk : styles.badgePending]}>
                <Text style={styles.badgeText}>{entry.status === 'available' ? 'Disponible' : 'En attente'}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  cards: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  card: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 20,
  },
  cardLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: '700' },
  cardValueGreen: { color: '#0a0' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 20, fontWeight: '700' },
  devSection: { backgroundColor: '#fff8e6', borderRadius: 12, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: '#e6d9b8' },
  devTitle: { fontSize: 12, fontWeight: '600', color: '#886600', marginBottom: 8 },
  devInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  devBtn: { backgroundColor: '#b8860b', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  devBtnText: { color: '#fff', fontWeight: '600' },
  historyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  empty: { color: '#888', marginBottom: 24 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  historyLeft: { flex: 1, marginRight: 12 },
  historyQuestion: { fontWeight: '600', marginBottom: 2 },
  historyAnswer: { fontSize: 13, color: '#666' },
  historyRight: { alignItems: 'flex-end' },
  historyReward: { fontWeight: '600', color: '#0a0', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgePending: { backgroundColor: '#fff3cd' },
  badgeOk: { backgroundColor: '#d4edda' },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
