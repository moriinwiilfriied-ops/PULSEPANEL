/**
 * Feed — cartes swipables, Passer / Accepter.
 * Sur Accepter → ouvre bottom sheet Answer.
 */

import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { getAvailableQuestions, type MockQuestion } from '@/lib/mockData';
import { useAppStore } from '@/store/useAppStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const completed = useAppStore((s) => s.completed);
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<MockQuestion | null>(null);

  useEffect(() => {
    if (!completed) {
      router.replace('/onboarding');
      return;
    }
    setQuestions(getAvailableQuestions());
  }, [completed]);

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

  const onAnswerClosed = () => {
    setSelectedQuestion(null);
    setQuestions(getAvailableQuestions());
    if (currentIndex >= questions.length - 1) setCurrentIndex(0);
    else setCurrentIndex((i) => i + 1);
  };

  if (!completed) return null;
  if (questions.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.title}>Plus de questions pour l'instant</Text>
        <Text style={styles.subtitle}>Revenez plus tard pour gagner des récompenses.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.header}>Feed</Text>

      <View style={styles.stack}>
        {questions.slice(currentIndex, currentIndex + 2).reverse().map((q, i) => (
          <View
            key={q.id}
            style={[
              styles.card,
              i === 0 ? styles.cardTop : styles.cardBehind,
            ]}
          >
            {q.imagePlaceholder && (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>{q.imagePlaceholder}</Text>
              </View>
            )}
            <Text style={styles.cardQuestion}>{q.question}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.cardType}>{q.type}</Text>
              <Text style={styles.cardReward}>+{q.reward.toFixed(2)} €</Text>
              <Text style={styles.cardEta}>~{q.etaSeconds}s</Text>
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
  header: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginTop: 48 },
  subtitle: { fontSize: 16, opacity: 0.7, textAlign: 'center', marginTop: 12 },
  stack: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 320 },
  card: {
    width: CARD_WIDTH,
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTop: { zIndex: 2 },
  cardBehind: { zIndex: 1, transform: [{ scale: 0.96 }], opacity: 0.8 },
  imagePlaceholder: {
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePlaceholderText: { fontSize: 14, color: '#888' },
  cardQuestion: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  cardMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  cardType: { fontSize: 12, color: '#666', textTransform: 'capitalize' },
  cardReward: { fontSize: 14, fontWeight: '600', color: '#0a0' },
  cardEta: { fontSize: 12, color: '#888' },
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
