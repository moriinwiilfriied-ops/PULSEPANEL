/**
 * Wallet — Pending, Disponible, total, historique, retraits.
 * Si Supabase configuré : user_balances + responses (historique gains) + withdrawals (Mes retraits).
 * CTA "Demander un retrait" → RPC request_withdrawal (réel) ; prérequis : min 5 €, pas de gel compte, plafond journalier.
 * "Mes retraits" = fetchMyWithdrawals() (pending / paid / rejected). Aucune donnée fictive.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Text } from '@/components/Themed';
import { useAppStore } from '@/store/useAppStore';
import { isSupabaseConfigured, fetchWalletFromSupabase, requestWithdrawal, fetchMyWithdrawals, type WithdrawalRow, type ServerWalletHistoryEntry } from '@/lib/supabaseApi';
import { supabase } from '@/lib/supabase';
import { wallet as copy } from '@/lib/uiCopy';
import { SHOW_DEBUG_UI } from '@/lib/debugFlags';
import { colors, spacing, radius, typo, buttonStyles, badgeStyles } from '@/lib/uiTheme';
import { PressableScale } from '@/components/PressableScale';

/** Entrée normalisée pour affichage (serveur ou local). */
type NormalizedHistoryEntry = {
  id: string;
  date: Date;
  questionText: string;
  answer: string;
  rewardEuros: number;
  status: 'available' | 'pending';
};

const INITIAL_HISTORY_LIMIT = 12;

function normalizeServerEntry(e: ServerWalletHistoryEntry): NormalizedHistoryEntry {
  return {
    id: e.id,
    date: new Date(e.createdAt),
    questionText: e.questionText,
    answer: e.answer ?? '—',
    rewardEuros: e.rewardCents / 100,
    status: e.payoutStatus,
  };
}

function normalizeLocalEntry(e: { id: string; at: string; questionTitle: string; answer: string; reward: number; status: 'available' | 'pending' }): NormalizedHistoryEntry {
  return {
    id: e.id,
    date: new Date(e.at),
    questionText: e.questionTitle,
    answer: e.answer,
    rewardEuros: e.reward,
    status: e.status,
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupByPeriod(entries: NormalizedHistoryEntry[], now: Date): { today: NormalizedHistoryEntry[]; thisWeek: NormalizedHistoryEntry[]; older: NormalizedHistoryEntry[] } {
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const today: NormalizedHistoryEntry[] = [];
  const thisWeek: NormalizedHistoryEntry[] = [];
  const older: NormalizedHistoryEntry[] = [];
  for (const e of entries) {
    const t = e.date.getTime();
    if (t >= todayStart.getTime()) today.push(e);
    else if (t >= weekStart.getTime()) thisWeek.push(e);
    else older.push(e);
  }
  return { today, thisWeek, older };
}

function formatEntryDate(d: Date): string {
  const today = startOfDay(new Date());
  const dDay = startOfDay(d);
  if (dDay.getTime() === today.getTime()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

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
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRow[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'available' | 'pending'>('all');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const useServer = isSupabaseConfigured();

  const formatWithdrawalDate = (createdAt: string, decidedAt: string | null): string => {
    const d = decidedAt ? new Date(decidedAt) : new Date(createdAt);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${h}:${min}`;
  };
  const pendingVal = useServer && serverWallet ? serverWallet.pendingCents / 100 : pending;
  const availableVal = useServer && serverWallet ? serverWallet.availableCents / 100 : available;
  const historyList = useServer && serverWallet ? serverWallet.history : history;
  const hasBalanceRow = serverWallet?.hasBalanceRow !== false;
  const total = pendingVal + availableVal;
  const lastCampaignId = serverWallet?.history?.[0]?.campaignId ?? null;
  const serverHistoryEmpty = !serverWallet?.history?.length;

  const normalizedList = useMemo(() => {
    if (useServer && serverWallet?.history) {
      return serverWallet.history.map(normalizeServerEntry).sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    return history
      .map((e) => normalizeLocalEntry({ id: e.id, at: e.at, questionTitle: e.questionTitle, answer: e.answer, reward: e.reward, status: e.status }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [useServer, serverWallet?.history, history]);

  const filteredList = useMemo(() => {
    if (historyFilter === 'all') return normalizedList;
    return normalizedList.filter((e) => e.status === historyFilter);
  }, [normalizedList, historyFilter]);

  const displayedList = useMemo(() => {
    if (showAllHistory) return filteredList;
    return filteredList.slice(0, INITIAL_HISTORY_LIMIT);
  }, [filteredList, showAllHistory]);

  const grouped = useMemo(() => groupByPeriod(displayedList, new Date()), [displayedList]);
  const hasMoreHistory = filteredList.length > INITIAL_HISTORY_LIMIT && !showAllHistory;

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

  const handleCopyUserId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id;
    if (!uid) return;
    await Clipboard.setStringAsync(uid);
    setCopyFeedback('Copié');
    setTimeout(() => setCopyFeedback(null), 2000);
  }, []);

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
  const withdrawErrorFromApi = (message: string): string => {
    if (message === 'minimum_500_cents') return copy.withdrawMinAmount;
    if (message === 'insufficient_balance') return copy.withdrawInsufficient;
    if (message === 'withdrawals_frozen') return copy.withdrawFrozen;
    if (message === 'daily_withdrawal_request_limit_reached') return copy.withdrawDailyLimit;
    return copy.withdrawGenericError;
  };

  const handleWithdraw = useCallback(async () => {
    if (!useServer || !canWithdraw) return;
    const amount = parseFloat(withdrawAmount.replace(',', '.'));
    if (Number.isNaN(amount) || amount < 5) {
      setWithdrawError(copy.withdrawMinAmount);
      return;
    }
    const amountCents = Math.round(amount * 100);
    if (amountCents > Math.round(availableVal * 100)) {
      setWithdrawError(copy.withdrawInsufficient);
      return;
    }
    setWithdrawError(null);
    setWithdrawing(true);
    const result = await requestWithdrawal(amountCents);
    setWithdrawing(false);
    if (result.error) {
      setWithdrawError(withdrawErrorFromApi(result.error.message));
      return;
    }
    setWithdrawError(null);
    setWithdrawAmount('5.00');
    await refreshWallet();
    setWithdrawSuccess(true);
    setTimeout(() => setWithdrawSuccess(false), 3000);
  }, [useServer, canWithdraw, withdrawAmount, availableVal, refreshWallet]);

  const wBg = colors.walletBackground;
  const wSurface = colors.walletSurface;
  const wElevated = colors.walletSurfaceElevated;
  /** Token positif canonique Wallet (émeraude). Ne pas utiliser success dans cet écran. */
  const wBalance = colors.walletBalance;
  const wBorder = colors.walletBorder;

  const heroFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(heroFade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [heroFade]);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: spacing.md, backgroundColor: wBg }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      testID="wallet-screen"
      refreshControl={
        useServer ? (
          <RefreshControl refreshing={refreshing} onRefresh={refreshWallet} tintColor={wBalance} />
        ) : undefined
      }
    >
      {SHOW_DEBUG_UI && (
        <View style={styles.devIdentity}>
          <Text style={styles.devIdentityTitle}>DEV</Text>
          <Text style={styles.devIdentityLine} numberOfLines={1}>
            Supabase user_id: {supabaseUserId ?? '—'}
          </Text>
          <TouchableOpacity style={styles.devCopyUserIdBtn} onPress={handleCopyUserId}>
            <Text style={styles.devCopyUserIdBtnText}>Copier mon user_id</Text>
          </TouchableOpacity>
          {copyFeedback === 'Copié' ? <Text style={styles.devResult}>Copié</Text> : null}
          <View style={styles.sourceBadgeRow}>
            <Text style={styles.sourceBadgeLabel}>SOURCE: </Text>
            <View style={[badgeStyles.base, sourceBadge === 'SB' ? { backgroundColor: colors.walletBalanceMuted, borderWidth: 1, borderColor: wBalance } : badgeStyles.neutral]}>
              <Text style={[styles.sourceBadgeText, sourceBadge === 'SB' && { color: wBalance }]}>{sourceBadge}</Text>
            </View>
          </View>
        </View>
      )}

      {useServer && serverWallet && !hasBalanceRow && (
        <View style={[styles.noBalanceBanner, { backgroundColor: colors.warningMuted, borderColor: colors.warning }]}>
          <Text style={[typo.caption, { color: colors.textPrimary }]}>{copy.noBalanceBanner}</Text>
        </View>
      )}

      {/* 1. Hero principal — montant disponible dominant, un seul sous-texte */}
      <Animated.View style={{ opacity: heroFade }}>
        <View style={[styles.hero, { backgroundColor: wElevated, borderColor: wBorder, borderLeftColor: wBalance, borderLeftWidth: 4 }]}>
          <Text style={[styles.heroAvailableLabel, { color: colors.textSecondary }]}>{copy.availableLabel}</Text>
          <Text style={[styles.heroAvailableAmount, { color: wBalance }]}>{availableVal.toFixed(2)} €</Text>
          <Text style={[styles.heroAvailableHint, { color: colors.textMuted }]}>
            {total === 0
              ? copy.heroSubtextPendingOnly
              : availableVal >= 5
                ? `${pendingVal.toFixed(2)} € ${copy.pendingLabel.toLowerCase()} · ${copy.heroSubtextMinWithdraw}`
                : availableVal > 0
                  ? `${pendingVal.toFixed(2)} € ${copy.pendingLabel.toLowerCase()} · ${(5 - availableVal).toFixed(2)} € ${copy.heroSubtextRemaining}`
                  : `${pendingVal.toFixed(2)} € ${copy.pendingLabel.toLowerCase()} · ${copy.heroSubtextMinWithdraw}`}
          </Text>
        </View>
      </Animated.View>

      {/* 2. Action principale unique — Demander un retrait OU Continuer à répondre */}
      {useServer && canWithdraw ? (
        <View style={[styles.withdrawSection, { backgroundColor: wElevated, borderColor: wBorder }]} testID="wallet-withdraw-section">
          <Text style={[styles.withdrawMinHint, { color: colors.textMuted }]}>{copy.withdrawMinAmount}</Text>
          <TextInput
            style={[styles.withdrawInput, { backgroundColor: wSurface, borderColor: wBorder, color: colors.textPrimary }]}
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
            placeholder="5.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            testID="wallet-withdraw-input"
          />
          <PressableScale
            style={[styles.withdrawCta, { backgroundColor: wBalance }, ...((!canWithdraw || withdrawing) ? [styles.withdrawCtaDisabled] : [])]}
            onPress={handleWithdraw}
            disabled={!canWithdraw || withdrawing}
            testID="wallet-withdraw-cta"
          >
            <Text style={styles.withdrawCtaText}>
              {withdrawing ? copy.withdrawSending : copy.withdrawButton}
            </Text>
          </PressableScale>
          {withdrawError ? <Text style={styles.withdrawError}>{withdrawError}</Text> : null}
          {withdrawSuccess ? <Text style={[styles.withdrawSuccess, { color: colors.success }]}>{copy.withdrawSuccess}</Text> : null}
          {availableVal < 5 && availableVal > 0 && (
            <Text style={styles.withdrawHintBelow}>{copy.withdrawHintMin}</Text>
          )}
        </View>
      ) : (
        <PressableScale
          style={[styles.primaryCta, { backgroundColor: wBalance }]}
          onPress={() => router.push('/(tabs)/feed')}
          testID="wallet-continue-cta"
        >
          <Text style={styles.primaryCtaText}>{copy.ctaContinueResponding}</Text>
        </PressableScale>
      )}

      {/* 3. Résumé secondaire — Disponible, En attente, Total gagné */}
      <View style={[styles.summarySecondary, { backgroundColor: wSurface, borderColor: wBorder }]}>
        <View style={styles.summarySecondaryCell}>
          <Text style={[styles.summarySecondaryLabel, { color: colors.textMuted }]}>{copy.availableLabel}</Text>
          <Text style={[styles.summarySecondaryValue, { color: wBalance }]}>{availableVal.toFixed(2)} €</Text>
        </View>
        <View style={[styles.summarySecondaryDivider, { backgroundColor: wBorder }]} />
        <View style={styles.summarySecondaryCell}>
          <Text style={[styles.summarySecondaryLabel, { color: colors.textMuted }]}>{copy.pendingLabel}</Text>
          <Text style={[styles.summarySecondaryValue, { color: colors.textPrimary }]}>{pendingVal.toFixed(2)} €</Text>
        </View>
        <View style={[styles.summarySecondaryDivider, { backgroundColor: wBorder }]} />
        <View style={styles.summarySecondaryCell}>
          <Text style={[styles.summarySecondaryLabel, { color: colors.textMuted }]}>{copy.totalEarnedLabel}</Text>
          <Text style={[styles.summarySecondaryValue, { color: colors.textPrimary }]}>{total.toFixed(2)} €</Text>
        </View>
      </View>

      {SHOW_DEBUG_UI && (
        <View style={[styles.devSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[typo.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            {useServer ? 'Validation = dashboard' : 'Simuler validation'}
          </Text>
          {useServer ? (
            <>
              <Text style={[typo.muted, { marginBottom: spacing.sm }]}>
                {serverHistoryEmpty
                  ? "Répondez d&apos;abord (SB)"
                  : 'Validation entreprise = dashboard.'}
              </Text>
              <TouchableOpacity
                style={[buttonStyles.secondary, serverHistoryEmpty && buttonStyles.disabled]}
                onPress={handleCopyCampaignId}
                disabled={serverHistoryEmpty}
              >
                <Text style={buttonStyles.secondaryText}>Copier l&apos;ID campagne</Text>
              </TouchableOpacity>
              {copyFeedback ? <Text style={[typo.muted, { marginTop: spacing.sm }]}>{copyFeedback}</Text> : null}
            </>
          ) : (
            <>
              <TextInput
                style={[styles.devInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={devAmount}
                onChangeText={setDevAmount}
                placeholder="Montant (vide = tout)"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity style={buttonStyles.secondary} onPress={handleSimulate}>
                <Text style={buttonStyles.secondaryText}>Transférer pending → disponible</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* 4. Activité récente */}
      {historyList.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{copy.activityRecentTitle}</Text>
          <View style={styles.filterRow}>
            {(['all', 'available', 'pending'] as const).map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterChip,
                  { borderColor: wBorder, backgroundColor: historyFilter === key ? wElevated : wBg },
                ]}
                onPress={() => setHistoryFilter(key)}
              >
                <Text style={[styles.filterChipText, { color: historyFilter === key ? colors.textPrimary : colors.textSecondary }]}>
                  {key === 'all' ? copy.filterAll : key === 'available' ? copy.filterAvailable : copy.filterPending}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.historyCard, { backgroundColor: wBg, borderColor: wBorder }]}>
            {filteredList.length === 0 ? (
              <Text style={styles.emptyList}>
                {historyFilter === 'all' ? copy.emptyHistory : copy.filterEmpty}
              </Text>
            ) : (
              <>
                {grouped.today.length > 0 && (
                  <View style={[styles.groupBlock, styles.groupBlockToday, { borderLeftColor: wBalance }]}>
                    <Text style={[typo.label, { color: wBalance, marginBottom: spacing.sm }]}>{copy.todayLabel}</Text>
                    {grouped.today.map((entry) => (
                      <View key={entry.id} style={[styles.historyRowRefined, { borderBottomColor: wBorder }]}>
                        <View style={styles.historyRowMain}>
                          <Text style={[styles.historyRowQuestion, { color: colors.textPrimary }]} numberOfLines={2}>{entry.questionText}</Text>
                          <Text style={[styles.historyRowAnswer, { color: colors.textSecondary }]} numberOfLines={1}>{entry.answer}</Text>
                        </View>
                        <View style={styles.historyRowMeta}>
                          <Text style={[styles.historyRowDate, { color: colors.textMuted }]}>{formatEntryDate(entry.date)}</Text>
                          <Text style={[styles.historyRowRewardRefined, { color: wBalance }]}>+{entry.rewardEuros.toFixed(2)} €</Text>
                          <View style={[badgeStyles.base, entry.status === 'available' ? { backgroundColor: colors.walletBalanceMuted, borderWidth: 1, borderColor: wBalance } : badgeStyles.warning]}>
                            <Text style={[styles.badgeTextSmall, entry.status === 'available' && { color: wBalance }]}>{entry.status === 'available' ? copy.statusAvailable : copy.statusPending}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {grouped.thisWeek.length > 0 && (
                  <View style={[styles.groupBlock, styles.groupBlockWeek, { borderLeftColor: wBorder }]}>
                    <Text style={[typo.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>{copy.thisWeekLabel}</Text>
                    {grouped.thisWeek.map((entry) => (
                      <View key={entry.id} style={[styles.historyRowRefined, { borderBottomColor: wBorder }]}>
                        <View style={styles.historyRowMain}>
                          <Text style={[styles.historyRowQuestion, { color: colors.textPrimary }]} numberOfLines={2}>{entry.questionText}</Text>
                          <Text style={[styles.historyRowAnswer, { color: colors.textSecondary }]} numberOfLines={1}>{entry.answer}</Text>
                        </View>
                        <View style={styles.historyRowMeta}>
                          <Text style={[styles.historyRowDate, { color: colors.textMuted }]}>{formatEntryDate(entry.date)}</Text>
                          <Text style={[styles.historyRowRewardRefined, { color: wBalance }]}>+{entry.rewardEuros.toFixed(2)} €</Text>
                          <View style={[badgeStyles.base, entry.status === 'available' ? { backgroundColor: colors.walletBalanceMuted, borderWidth: 1, borderColor: wBalance } : badgeStyles.warning]}>
                            <Text style={[styles.badgeTextSmall, entry.status === 'available' && { color: wBalance }]}>{entry.status === 'available' ? copy.statusAvailable : copy.statusPending}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {grouped.older.length > 0 && (
                  <View style={[styles.groupBlock, styles.groupBlockOlder, { borderLeftColor: wBorder }]}>
                    <Text style={[typo.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>{copy.olderLabel}</Text>
                    {grouped.older.map((entry) => (
                      <View key={entry.id} style={[styles.historyRowRefined, { borderBottomColor: wBorder }]}>
                        <View style={styles.historyRowMain}>
                          <Text style={[styles.historyRowQuestion, { color: colors.textPrimary }]} numberOfLines={2}>{entry.questionText}</Text>
                          <Text style={[styles.historyRowAnswer, { color: colors.textSecondary }]} numberOfLines={1}>{entry.answer}</Text>
                        </View>
                        <View style={styles.historyRowMeta}>
                          <Text style={[styles.historyRowDate, { color: colors.textMuted }]}>{formatEntryDate(entry.date)}</Text>
                          <Text style={[styles.historyRowRewardRefined, { color: wBalance }]}>+{entry.rewardEuros.toFixed(2)} €</Text>
                          <View style={[badgeStyles.base, entry.status === 'available' ? { backgroundColor: colors.walletBalanceMuted, borderWidth: 1, borderColor: wBalance } : badgeStyles.warning]}>
                            <Text style={[styles.badgeTextSmall, entry.status === 'available' && { color: wBalance }]}>{entry.status === 'available' ? copy.statusAvailable : copy.statusPending}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {hasMoreHistory && (
                  <PressableScale
                    style={[styles.seeMoreBtn, { borderColor: wBorder }]}
                    onPress={() => setShowAllHistory(true)}
                  >
                    <Text style={[typo.caption, { color: colors.textSecondary }]}>{copy.seeMoreHistory}</Text>
                  </PressableScale>
                )}
              </>
            )}
          </View>
        </>
      )}

      {/* 5. Mes retraits — historique des retraits, secondaire */}
      {useServer && (
        <View testID="wallet-my-withdrawals">
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>{copy.myWithdrawalsTitle}</Text>
          <View style={[styles.historyCard, { backgroundColor: wBg, borderColor: wBorder }]}>
            {myWithdrawals.length === 0 ? (
              <Text style={styles.emptyList}>{copy.emptyWithdrawals}</Text>
            ) : (
              <View style={styles.listBlock}>
                {myWithdrawals.map((w) => (
                  <View key={w.id} style={[styles.listRow, { borderBottomColor: wBorder }]}>
                    <View style={styles.listRowLeft}>
                      <Text style={styles.listRowAmount}>{(w.amount_cents / 100).toFixed(2)} €</Text>
                      <Text style={styles.listRowDate}>{formatWithdrawalDate(w.created_at, w.decided_at)}</Text>
                      {w.method ? <Text style={styles.listRowMeta}>Méthode: {w.method}</Text> : null}
                    </View>
                    <View style={styles.listRowRight}>
                      <View style={[badgeStyles.base, w.status === 'paid' ? { backgroundColor: colors.walletBalanceMuted, borderColor: wBalance } : w.status === 'rejected' ? badgeStyles.danger : badgeStyles.warning]}>
                        <Text style={styles.badgeText}>
                          {w.status === 'pending' ? copy.statusPending : w.status === 'paid' ? copy.statusPaid : copy.statusRejected}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {historyList.length === 0 && (
        <>
          <Text style={[styles.sectionLabelHistory, { color: colors.textSecondary }]}>{copy.historyTitle}</Text>
          <View style={[styles.emptyStateCard, { backgroundColor: wSurface, borderColor: wBorder }]}>
            <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>{copy.emptyHistory}</Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textMuted }]}>{copy.emptyHistorySubtext}</Text>
            <PressableScale
              style={[styles.emptyStateCta, { backgroundColor: wBalance }]}
              onPress={() => router.push('/(tabs)/feed')}
            >
              <Text style={styles.emptyStateCtaText}>{copy.emptyHistoryCta}</Text>
            </PressableScale>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },
  devIdentity: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  devIdentityTitle: { fontSize: 11, fontWeight: '700', color: colors.trust, marginBottom: 6 },
  devIdentityLine: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  devCopyUserIdBtn: { backgroundColor: colors.trust, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, alignSelf: 'flex-start', marginTop: spacing.sm },
  devCopyUserIdBtnText: { color: colors.background, fontSize: 12, fontWeight: '600' },
  sourceBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  sourceBadgeLabel: { fontSize: 11, color: colors.textMuted, marginRight: spacing.xs },
  sourceBadgeText: { fontSize: 11, fontWeight: '600', color: colors.textPrimary },
  noBalanceBanner: {
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  hero: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  heroAvailableLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  heroAvailableAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  heroAvailableHint: {
    fontSize: 12,
  },
  primaryCta: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: spacing.lg,
  },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d0d0f',
  },
  summarySecondary: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  summarySecondaryCell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  summarySecondaryLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2, textAlign: 'center' },
  summarySecondaryValue: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  summarySecondaryDivider: { width: 1, alignSelf: 'stretch', marginHorizontal: spacing.xs, opacity: 0.5 },
  withdrawSection: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  withdrawMinHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  withdrawInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    fontSize: 18,
  },
  withdrawCta: { marginBottom: spacing.sm },
  withdrawCtaText: { fontSize: 16, fontWeight: '600', color: '#0d0d0f' },
  withdrawCtaDisabled: { opacity: 0.45 },
  withdrawError: { fontSize: 13, color: colors.danger, marginTop: spacing.sm },
  withdrawSuccess: { fontSize: 13, marginTop: spacing.sm },
  withdrawHintBelow: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  devSection: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
  },
  devInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  devResult: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  sectionLabelHistory: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  historyCard: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  emptyList: {
    fontSize: 15,
    color: colors.textMuted,
    paddingVertical: spacing.section,
    textAlign: 'center',
  },
  emptyStateCard: {
    borderRadius: radius.lg,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyStateCta: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    minWidth: 160,
    alignItems: 'center',
  },
  emptyStateCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background,
  },
  groupBlock: { marginBottom: spacing.lg },
  groupBlockToday: { paddingLeft: spacing.md, borderLeftWidth: 3, marginBottom: spacing.lg },
  groupBlockWeek: { paddingLeft: spacing.md, borderLeftWidth: 2, opacity: 0.95 },
  groupBlockOlder: { paddingLeft: spacing.md, borderLeftWidth: 1, opacity: 0.9 },
  historyRowRefined: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  historyRowMain: { flex: 1, marginRight: spacing.lg },
  historyRowQuestion: { fontSize: 14, marginBottom: 2 },
  historyRowAnswer: { fontSize: 12, marginBottom: 0 },
  historyRowMeta: { alignItems: 'flex-end', minWidth: 88 },
  historyRowDate: { fontSize: 11, marginBottom: 2 },
  historyRowRewardRefined: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  badgeTextSmall: { fontSize: 10, fontWeight: '600', color: colors.textPrimary },
  seeMoreBtn: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  listBlock: {},
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.section,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowLeft: { flex: 1, marginRight: spacing.lg },
  listRowRight: { alignItems: 'flex-end' },
  listRowAmount: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  listRowDate: { fontSize: 13, color: colors.textSecondary },
  listRowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  listRowQuestion: { fontSize: 15, color: colors.textPrimary, marginBottom: 2 },
  listRowAnswer: { fontSize: 13, color: colors.textSecondary },
  listRowReward: { fontSize: 15, fontWeight: '600', color: colors.walletBalance, marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.textPrimary },
});
