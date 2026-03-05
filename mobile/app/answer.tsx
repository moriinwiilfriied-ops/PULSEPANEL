/**
 * Answer — bottom sheet / modal selon le type (choix, oui/non, texte).
 * Envoyer → submitAnswer → affiche overlay Reward puis ferme.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { mockQuestions, submitAnswer, type MockQuestion, type QuestionType } from '@/lib/mockData';

export default function AnswerScreen() {
  const insets = useSafeAreaInsets();
  const { questionId } = useLocalSearchParams<{ questionId: string }>();
  const question = mockQuestions.find((q) => q.id === questionId);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [step, setStep] = useState<'form' | 'reward'>('form');
  const [rewardAmount, setRewardAmount] = useState(0);

  if (!question) {
    return (
      <View style={styles.container}>
        <Text>Question introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSend = () => {
    let answer: string;
    if (question.type === 'text') {
      answer = textAnswer.trim() || '(vide)';
    } else if (selectedOption) {
      answer = selectedOption;
    } else {
      return;
    }
    const entry = submitAnswer(question.id, answer);
    setRewardAmount(entry.reward);
    setStep('reward');
  };

  const handleCloseReward = () => {
    router.back();
  };

  const canSend =
    question.type === 'text' ? textAnswer.trim().length > 0 : selectedOption != null;

  if (step === 'reward') {
    return (
      <View style={[styles.container, styles.rewardContainer, { paddingTop: insets.top + 48 }]}>
        <View style={styles.rewardCard}>
          <Text style={styles.rewardTitle}>Réponse enregistrée</Text>
          <Text style={styles.rewardAmount}>+{rewardAmount.toFixed(2)} €</Text>
          <Text style={styles.rewardSub}>Crédité en attente de validation.</Text>
          <TouchableOpacity style={styles.rewardBtn} onPress={handleCloseReward}>
            <Text style={styles.rewardBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 60}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.question}>{question.question}</Text>
        <Text style={styles.typeLabel}>{question.type}</Text>

        {question.type === 'text' && (
          <TextInput
            style={styles.textInput}
            value={textAnswer}
            onChangeText={setTextAnswer}
            placeholder="Votre réponse..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={3}
          />
        )}

        {(question.type === 'choice' || question.type === 'poll') && question.options && (
          <View style={styles.options}>
            {question.options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.option, selectedOption === opt && styles.optionSelected]}
                onPress={() => setSelectedOption(opt)}
              >
                <Text style={[styles.optionText, selectedOption === opt && styles.optionTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={styles.sendBtnText}>Envoyer</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  scroll: { padding: 24, paddingTop: 32 },
  link: { color: '#2f95dc', marginTop: 16 },
  question: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  typeLabel: { fontSize: 12, color: '#888', marginBottom: 20, textTransform: 'capitalize' },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  options: { gap: 12, marginBottom: 24 },
  option: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionSelected: { borderColor: '#171717', backgroundColor: '#f0f0f0' },
  optionText: { fontSize: 16 },
  optionTextSelected: { fontWeight: '600' },
  sendBtn: {
    backgroundColor: '#171717',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  rewardContainer: { justifyContent: 'center', alignItems: 'center' },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    minWidth: 280,
  },
  rewardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  rewardAmount: { fontSize: 32, fontWeight: '700', color: '#0a0', marginBottom: 8 },
  rewardSub: { fontSize: 14, color: '#666', marginBottom: 24 },
  rewardBtn: {
    backgroundColor: '#171717',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  rewardBtnText: { color: '#fff', fontWeight: '600' },
});
