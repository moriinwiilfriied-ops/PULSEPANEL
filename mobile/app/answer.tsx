/**
 * Answer — bottom sheet / modal selon le type (choix, oui/non, texte).
 * Envoyer → submitAnswer → affiche overlay Reward puis ferme.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { mockQuestions, submitAnswer, type MockQuestion } from '@/lib/mockData';
import { fetchCampaignById, submitResponseToSupabase, responseLimitErrorToMessage } from '@/lib/supabaseApi';
import { answer as copy } from '@/lib/uiCopy';

export default function AnswerScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { questionId } = useLocalSearchParams<{ questionId: string }>();
  const textColor = colors.text;
  const mutedColor = colors.tabIconDefault;
  const sheetBg = colors.background;
  const cardBg = colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const borderColor = colors.tabIconDefault;
  const selectionColor = colors.tint;
  const [supabaseQuestion, setSupabaseQuestion] = useState<MockQuestion | null>(null);
  const [loading, setLoading] = useState(!!questionId && !mockQuestions.find((q) => q.id === questionId) && /^[0-9a-f-]{36}$/i.test(questionId ?? ''));
  const question = mockQuestions.find((q) => q.id === questionId) ?? supabaseQuestion;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [step, setStep] = useState<'form' | 'reward'>('form');
  const [rewardAmount, setRewardAmount] = useState(0);
  const [answerStartedAt, setAnswerStartedAt] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!questionId || question) return;
    if (!/^[0-9a-f-]{36}$/i.test(questionId)) return;
    (async () => {
      const row = await fetchCampaignById(questionId);
      if (row) {
        const options = Array.isArray(row.options) ? row.options : [];
        const questionText = (row.question ?? row.name ?? '').trim() || 'Question (à définir)';
        const opts = options.length ? options : ['Oui', 'Non'];
        setSupabaseQuestion({
          id: row.id,
          question: questionText,
          type: (row.template === 'A/B' ? 'poll' : 'choice') as MockQuestion['type'],
          options: opts,
          reward: row.reward_cents / 100,
          etaSeconds: 45,
          campaignId: row.id,
        });
      }
      setLoading(false);
    })();
  }, [questionId, question]);

  useEffect(() => {
    if (question && step === 'form') setAnswerStartedAt((t) => (t == null ? Date.now() : t));
  }, [question?.id, step]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: sheetBg }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!question) {
    return (
      <View style={[styles.container, { backgroundColor: sheetBg }]}>
        <Text style={{ color: textColor }}>Question introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.link, { color: colors.tint }]}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSend = async () => {
    let answer: string;
    if (question.type === 'text') {
      answer = textAnswer.trim() || '(vide)';
    } else if (selectedOption) {
      answer = selectedOption;
    } else {
      return;
    }
    const isSupabase = /^[0-9a-f-]{36}$/i.test(question.id);
    const durationMs = answerStartedAt != null ? Math.round(Date.now() - answerStartedAt) : undefined;
    if (isSupabase) {
      setSubmitError(null);
      const { error, reward } = await submitResponseToSupabase({
        campaignId: question.id,
        question: question.question,
        answer,
        durationMs,
        rewardCents: Math.round(question.reward * 100),
      });
      if (error) {
        const friendly = responseLimitErrorToMessage(error.message);
        setSubmitError(friendly ?? copy.submitErrorDefault);
        return;
      }
      setRewardAmount(reward ?? question.reward);
      setStep('reward');
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
      <View style={[styles.container, styles.rewardContainer, { paddingTop: insets.top + 48, backgroundColor: sheetBg }]}>
        <View style={[styles.rewardCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: borderColor }]}>
          <Text style={[styles.rewardTitle, { color: textColor }]}>Réponse enregistrée</Text>
          <Text style={styles.rewardAmount}>+{rewardAmount.toFixed(2)} €</Text>
          <Text style={[styles.rewardSub, { color: mutedColor }]}>Crédité en attente de validation.</Text>
          <TouchableOpacity style={[styles.rewardBtn, { backgroundColor: colors.tint }]} onPress={handleCloseReward}>
            <Text style={styles.rewardBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const optionBg = (selected: boolean) =>
    selected ? (colorScheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)') : cardBg;
  const optionBorder = (selected: boolean) => (selected ? colors.tint : borderColor);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: sheetBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 60}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.question, { color: textColor }]}>{question.question}</Text>
        <Text style={[styles.typeLabel, { color: mutedColor }]}>{question.type}</Text>

        {question.type === 'text' && (
          <TextInput
            style={[styles.textInput, { color: textColor, backgroundColor: cardBg, borderColor }]}
            value={textAnswer}
            onChangeText={setTextAnswer}
            placeholder="Votre réponse..."
            placeholderTextColor={mutedColor}
            selectionColor={selectionColor}
            multiline
            numberOfLines={3}
          />
        )}

        {submitError ? (
          <View style={[styles.errorBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(200,80,80,0.2)' : 'rgba(200,80,80,0.1)', borderColor: '#c44' }]}>
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}
        {(question.type === 'choice' || question.type === 'poll') && question.options && (
          <View style={styles.options}>
            {question.options.map((opt) => {
              const selected = selectedOption === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.option,
                    { backgroundColor: optionBg(selected), borderColor: optionBorder(selected) },
                  ]}
                  onPress={() => setSelectedOption(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionText, { color: textColor }, selected && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: colors.tint },
            !canSend && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={[styles.sendBtnText, { color: colorScheme === 'dark' ? '#000' : '#fff' }]}>
            Envoyer
          </Text>
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
  errorBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#c44' },
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
  center: { justifyContent: 'center', alignItems: 'center' },
});
