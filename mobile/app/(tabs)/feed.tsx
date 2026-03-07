/**
 * Feed — cartes swipables, Passer / Accepter.
 * Sur Accepter → ouvre bottom sheet Answer.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getAvailableQuestions, type FeedQuestion } from '@/lib/mockData';
import { getFeedQuestionsWithSource, type FeedSource } from '@/lib/supabaseApi';
import { useAppStore } from '@/store/useAppStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const completed = useAppStore((s) => s.completed);
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [feedSource, setFeedSource] = useState<FeedSource>('mock');
  const [feedError, setFeedError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<FeedQuestion | null>(null);

  useEffect(() => {
    if (!completed) {
      router.replace('/onboarding');
      return;
    }
  }, [completed]);

  const loadQuestions = useCallback(() => {
    if (!completed) return;
    (async () => {
      const res = await getFeedQuestionsWithSource();
      setFeedSource(res.source);
      setFeedError(res.error ?? null);
      setQuestions(res.items);
    })();
  }, [completed]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useFocusEffect(
    useCallback(() => {
      if (completed) loadQuestions();
    }, [completed, loadQuestions])
  );

  useEffect(() => {
    if (questions.length > 0 && currentIndex >= questions.length) {
      setCurrentIndex(0);
    }
  }, [questions.length, currentIndex]);

  const current = questions[currentIndex];

  const handlePass = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };

  const handleAccept = () => {
    if (current) {
      setSelectedQuestion(current);
      router.push(`/answer?questionId=${current.id}`);
    }
  };

  const   onAnswerClosed = () => {
    setSelectedQuestion(null);
    loadQuestions();
    if (currentIndex >= questions.length - 1) setCurrentIndex(0);
    else setCurrentIndex((i) => i + 1);
  };

  if (!completed) return null;

  const emptyMessage =
    feedSource === 'supabase_error'
      ? 'Impossible de charger les campagnes.'
      : feedSource === 'supabase'
        ? 'Aucune campagne disponible pour le moment.'
        : 'Plus de questions pour l\'instant.';
  const emptySub =
    feedSource === 'supabase_error'
      ? (__DEV__ && feedError ? feedError : 'Vérifiez votre connexion ou réessayez.')
      : 'Revenez plus tard pour gagner des récompenses.';

  if (questions.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        {__DEV__ && (
          <View style={styles.devPanel}>
            <Text style={styles.devLine}>
              SOURCE: {feedSource === 'supabase' ? 'SB' : feedSource === 'supabase_error' ? 'SB_ERR' : 'MOCK'}
            </Text>
            <Text style={styles.devLine}>campaigns loaded: 0</Text>
            {feedError ? <Text style={[styles.devLine, styles.devError]} numberOfLines={2}>last error: {feedError}</Text> : null}
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{emptyMessage}</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>{emptySub}</Text>
      </View>
    );
  }

  const cardBgTop = colorScheme === 'dark' ? 'rgba(18,18,18,0.92)' : 'rgba(255,255,255,0.95)';
  const cardBgBehind = colorScheme === 'dark' ? 'rgba(18,18,18,0.4)' : 'rgba(255,255,255,0.5)';
  const cardBorder = colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : '#eee';
  const textColor = colors.text;
  const mutedColor = colors.tabIconDefault;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {__DEV__ && (
        <View style={styles.devPanel}>
          <Text style={styles.devLine}>
            SOURCE: {feedSource === 'supabase' ? 'SB' : feedSource === 'supabase_error' ? 'SB_ERR' : 'MOCK'}
          </Text>
          <Text style={styles.devLine}>campaigns loaded: {questions.length}</Text>
          {feedError ? <Text style={[styles.devLine, styles.devError]} numberOfLines={2}>last error: {feedError}</Text> : null}
        </View>
      )}
      <Text style={[styles.header, { color: textColor }]}>Feed</Text>

      <View style={styles.stack}>
        {questions.slice(currentIndex, currentIndex + 2).reverse().map((q, i) => (
          <View
            key={q.id}
            style={[
              styles.card,
              {
                backgroundColor: i === 0 ? cardBgTop : cardBgBehind,
                borderColor: cardBorder,
                overflow: 'hidden',
                backfaceVisibility: 'hidden',
              },
              i === 0 ? styles.cardTop : styles.cardBehind,
            ]}
          >
            {q.imagePlaceholder ? (
              <View style={[styles.imagePlaceholder, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
                <Text style={[styles.imagePlaceholderText, { color: mutedColor }]}>{q.imagePlaceholder}</Text>
              </View>
            ) : null}
            <View style={styles.badgeWrap}>
              <View style={[styles.badge, q.source === 'supabase' ? styles.badgeSb : styles.badgeMock]}>
                <Text style={styles.badgeText}>{q.source === 'supabase' ? 'SB' : 'MOCK'}</Text>
              </View>
            </View>
            <Text
              style={[
                styles.cardQuestion,
                { color: textColor },
                i !== 0 && styles.cardBehindText,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {q.questionText || 'Question (à définir)'}
            </Text>
            <View style={[styles.cardMeta, i !== 0 && styles.cardBehindText]}>
              <Text style={[styles.cardType, { color: mutedColor }]}>{q.type}</Text>
              <Text style={styles.cardReward}>+{q.reward.toFixed(2)} €</Text>
              <Text style={[styles.cardEta, { color: mutedColor }]}>~{q.etaSeconds}s</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={styles.btnPass} onPress={handlePass}>
          <Text style={styles.btnPassText}>Passer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnAccept} onPress={handleAccept}>
          <Text style={styles.btnAcceptText}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  devPanel: {
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e8f4f8',
    borderWidth: 1,
    borderColor: '#b8d4e0',
  },
  devLine: { fontSize: 11, fontFamily: 'monospace' },
  devError: { color: '#c00', marginTop: 4 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginTop: 48 },
  subtitle: { fontSize: 16, opacity: 0.7, textAlign: 'center', marginTop: 12 },
  stack: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 320 },
  card: {
    width: CARD_WIDTH,
    position: 'absolute',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
  },
  cardTop: { zIndex: 2 },
  cardBehind: { zIndex: 1, transform: [{ scale: 0.96 }], opacity: 0.25 },
  cardBehindText: { opacity: 0 },
  imagePlaceholder: {
    height: 120,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePlaceholderText: { fontSize: 14 },
  badgeWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeSb: { backgroundColor: '#2563eb' },
  badgeMock: { backgroundColor: '#6b7280' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardQuestion: { fontSize: 19, fontWeight: '600', marginBottom: 12 },
  cardMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  cardType: { fontSize: 12, textTransform: 'capitalize' },
  cardReward: { fontSize: 14, fontWeight: '600', color: '#0a0' },
  cardEta: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 16, justifyContent: 'center', paddingTop: 24 },
  btnPass: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  btnPassText: { fontSize: 16, fontWeight: '600' },
  btnAccept: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: '#171717',
  },
  btnAcceptText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
