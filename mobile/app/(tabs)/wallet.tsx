/**
 * Wallet — Pending, Disponible, total, historique.
 * Si Supabase configuré : lecture user_balances + 20 dernières responses.
 * Sinon : store local. DEV : identité + source (SB/MOCK), copier ID campagne pour validation dashboard.
 */

import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Text } from '@/components/Themed';
import { useAppStore } from '@/store/useAppStore';
import { isSupabaseConfigured, fetchWalletFromSupabase, requestWithdrawal, fetchMyWithdrawals, type WithdrawalRow } from '@/lib/supabaseApi';
import { supabase } from '@/lib/supabase';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const {
    pending,
    available,
    history,
    serverWallet,
    setServerWallet,
    simulateValidation,
    validateAllPending,
  } = useAppStore();
  const [devAmount, setDevAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [sourceBadge, setSourceBadge] = useState<'SB' | 'MOCK'>('MOCK');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('5.00');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRow[]>([]);

  const useServer = isSupabaseConfigured();
  const pendingVal = useServer && serverWallet ? serverWallet.pendingCents / 100 : pending;
  const availableVal = useServer && serverWallet ? serverWallet.availableCents / 100 : available;
  const historyList = useServer && serverWallet ? serverWallet.history : history;
  const hasBalanceRow = serverWallet?.hasBalanceRow !== false;
  const total = pendingVal + availableVal;
  const lastCampaignId = serverWallet?.history?.[0]?.campaignId ?? null;
  const serverHistoryEmpty = !serverWallet?.history?.length;

  const refreshWallet = useCallback(async () => {
    if (!useServer) return;
    setRefreshing(true);
    const [data, withdrawals] = await Promise.all([
      fetchWalletFromSupabase(),
      fetchMyWithdrawals(),
    ]);
    if (data) {
      setServerWallet(data);
      setSourceBadge('SB');
    } else {
      setSourceBadge('MOCK');
    }
    setMyWithdrawals(withdrawals);
    const { data: { user } } = await supabase.auth.getUser();
    setSupabaseUserId(user?.id ?? null);
    setRefreshing(false);
  }, [useServer, setServerWallet]);

  useFocusEffect(
    useCallback(() => {
      if (useServer) {
        refreshWallet();
        supabase.auth.getUser().then(({ data: { user } }) => setSupabaseUserId(user?.id ?? null));
      }
    }, [useServer, refreshWallet])
  );

  const handleCopyCampaignId = useCallback(async () => {
    if (!lastCampaignId) return;
    await Clipboard.setStringAsync(lastCampaignId);
    setCopyFeedback('ID copié');
    setTimeout(() => setCopyFeedback(null), 2000);
  }, [lastCampaignId]);

  const handleSimulate = () => {
    if (useServer) {
      return;
    }
    const amount = parseFloat(devAmount.replace(',', '.'));
    if (!Number.isNaN(amount) && amount > 0) {
      simulateValidation(amount);
      setDevAmount('');
    } else {
      validateAllPending();
      setDevAmount('');
    }
  };

  const canWithdraw = useServer && availableVal >= 5 && !withdrawing;
  const handleWithdraw = useCallback(async () => {
    if (!useServer || !canWithdraw) return;
    const amount = parseFloat(withdrawAmount.replace(',', '.'));
    if (Number.isNaN(amount) || amount < 5) {
      setWithdrawError('Minimum 5,00 €');
      return;
    }
    const amountCents = Math.round(amount * 100);
    setWithdrawError(null);
    setWithdrawing(true);
    const result = await requestWithdrawal(amountCents);
    setWithdrawing(false);
    if (result.error) {
      setWithdrawError(result.error.message);
      return;
    }
    setWithdrawAmount('5.00');
    await refreshWallet();
  }, [useServer, canWithdraw, withdrawAmount, refreshWallet]);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 24 }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={
        useServer ? (
          <RefreshControl refreshing={refreshing} onRefresh={refreshWallet} />
        ) : undefined
      }
    >
      <Text style={styles.header}>Wallet</Text>

      {__DEV__ && (
        <View style={styles.devIdentity}>
          <Text style={styles.devIdentityTitle}>DEV</Text>
          <Text style={styles.devIdentityLine} numberOfLines={1}>
            Supabase user_id: {supabaseUserId ?? '—'}
          </Text>
          <View style={styles.sourceBadgeRow}>
            <Text style={styles.sourceBadgeLabel}>SOURCE: </Text>
            <View style={[styles.sourceBadge, sourceBadge === 'SB' ? styles.sourceBadgeSb : styles.sourceBadgeMock]}>
              <Text style={styles.sourceBadgeText}>{sourceBadge}</Text>
            </View>
          </View>
        </View>
      )}

      {useServer && serverWallet && !hasBalanceRow && (
        <View style={styles.noBalanceBanner}>
          <Text style={styles.noBalanceText}>
            Aucun solde serveur pour cet utilisateur (répondez à une question SB).
          </Text>
        </View>
      )}

      <View style={styles.cards}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>En attente</Text>
          <Text style={styles.cardValue}>{pendingVal.toFixed(2)} €</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Disponible</Text>
          <Text style={[styles.cardValue, styles.cardValueGreen]}>{availableVal.toFixed(2)} €</Text>
        </View>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{total.toFixed(2)} €</Text>
      </View>

      {useServer && (
        <View style={styles.withdrawSection}>
          <Text style={styles.withdrawTitle}>Retirer</Text>
          <TextInput
            style={styles.withdrawInput}
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
            placeholder="5.00"
            placeholderTextColor="#888"
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={[styles.withdrawBtn, (!canWithdraw || withdrawing) && styles.withdrawBtnDisabled]}
            onPress={handleWithdraw}
            disabled={!canWithdraw || withdrawing}
          >
            <Text style={styles.withdrawBtnText}>
              {withdrawing ? 'Envoi…' : 'Demander un retrait'}
            </Text>
          </TouchableOpacity>
          {withdrawError ? <Text style={styles.withdrawError}>{withdrawError}</Text> : null}
          {useServer && availableVal < 5 && availableVal > 0 && (
            <Text style={styles.withdrawHint}>Disponible &lt; 5 € : retrait désactivé.</Text>
          )}
        </View>
      )}

      <View style={styles.devSection}>
        <Text style={styles.devTitle}>
          DEV — {useServer ? 'Validation = dashboard' : 'Simuler validation'}
        </Text>
        {useServer ? (
          <>
            <Text style={styles.devHint}>
              {serverHistoryEmpty
                ? "Répondez d'abord (SB)"
                : 'Validation entreprise = dashboard.'}
            </Text>
            <TouchableOpacity
              style={[styles.devBtn, serverHistoryEmpty && styles.devBtnDisabled]}
              onPress={handleCopyCampaignId}
              disabled={serverHistoryEmpty}
            >
              <Text style={styles.devBtnText}>Copier l'ID campagne dans le presse-papier</Text>
            </TouchableOpacity>
            {copyFeedback ? <Text style={styles.devResult}>{copyFeedback}</Text> : null}
          </>
        ) : (
          <>
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
          </>
        )}
      </View>

      {useServer && myWithdrawals.length > 0 && (
        <>
          <Text style={styles.historyTitle}>Mes retraits</Text>
          {myWithdrawals.map((w) => (
            <View key={w.id} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyQuestion}>{(w.amount_cents / 100).toFixed(2)} €</Text>
                <Text style={styles.historyAnswer}>
                  {w.status === 'pending' ? 'En attente' : w.status === 'paid' ? 'Payé' : 'Refusé'}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <View style={[styles.badge, w.status === 'paid' ? styles.badgeOk : w.status === 'rejected' ? styles.badgeRejected : styles.badgePending]}>
                  <Text style={styles.badgeText}>
                    {w.status === 'pending' ? 'En attente' : w.status === 'paid' ? 'Payé' : 'Refusé'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={styles.historyTitle}>Historique</Text>
      {historyList.length === 0 ? (
        <Text style={styles.empty}>Aucune réponse encore.</Text>
      ) : useServer ? (
        (serverWallet?.history ?? []).map((entry) => (
          <View key={entry.id} style={styles.historyRow}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyQuestion} numberOfLines={2}>{entry.questionText}</Text>
              <Text style={styles.historyAnswer} numberOfLines={1}>{entry.answer ?? '—'}</Text>
            </View>
            <View style={styles.historyRight}>
              <Text style={styles.historyReward}>+{(entry.rewardCents / 100).toFixed(2)} €</Text>
              <View style={[styles.badge, entry.payoutStatus === 'available' ? styles.badgeOk : styles.badgePending]}>
                <Text style={styles.badgeText}>{entry.payoutStatus === 'available' ? 'Disponible' : 'En attente'}</Text>
              </View>
            </View>
          </View>
        ))
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
  devIdentity: {
    backgroundColor: '#e8f4f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b8d4e0',
  },
  devIdentityTitle: { fontSize: 11, fontWeight: '700', color: '#006688', marginBottom: 6 },
  devIdentityLine: { fontSize: 11, color: '#333', marginBottom: 4 },
  sourceBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  sourceBadgeLabel: { fontSize: 11, color: '#666', marginRight: 4 },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sourceBadgeSb: { backgroundColor: '#0a0' },
  sourceBadgeMock: { backgroundColor: '#888' },
  sourceBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  noBalanceBanner: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6d9b8',
  },
  noBalanceText: { fontSize: 13, color: '#856404' },
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 20, fontWeight: '700' },
  devSection: {
    backgroundColor: '#fff8e6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e6d9b8',
  },
  devTitle: { fontSize: 12, fontWeight: '600', color: '#886600', marginBottom: 8 },
  devHint: { fontSize: 12, color: '#666', marginBottom: 8 },
  devInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  devBtn: { backgroundColor: '#b8860b', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  devBtnDisabled: { opacity: 0.5 },
  devBtnText: { color: '#fff', fontWeight: '600' },
  devResult: { fontSize: 12, color: '#666', marginTop: 8 },
  historyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  empty: { color: '#888', marginBottom: 24 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyLeft: { flex: 1, marginRight: 12 },
  historyQuestion: { fontWeight: '600', marginBottom: 2 },
  historyAnswer: { fontSize: 13, color: '#666' },
  historyRight: { alignItems: 'flex-end' },
  historyReward: { fontWeight: '600', color: '#0a0', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgePending: { backgroundColor: '#fff3cd' },
  badgeOk: { backgroundColor: '#d4edda' },
  badgeRejected: { backgroundColor: '#f8d7da' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  withdrawSection: {
    backgroundColor: '#f0f8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  withdrawTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  withdrawInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  withdrawBtn: { backgroundColor: '#2e7d32', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  withdrawBtnDisabled: { opacity: 0.5 },
  withdrawBtnText: { color: '#fff', fontWeight: '600' },
  withdrawError: { fontSize: 12, color: '#c62828', marginTop: 8 },
  withdrawHint: { fontSize: 12, color: '#666', marginTop: 6 },
});
