/**
 * Answer — bottom sheet / modal selon le type (choix, oui/non, texte).
 * Envoyer → submitAnswer → affiche overlay Reward puis ferme.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { mockQuestions, submitAnswer, type MockQuestion } from '@/lib/mockData';
import { fetchCampaignById, campaignToFeedQuestion, submitResponseToSupabase, responseLimitErrorToMessage } from '@/lib/supabaseApi';
import { MediaStage } from '@/components/MediaStage';
import { getResponseTypeLabel } from '@/lib/responseTypeLabels';
import { answer as copy } from '@/lib/uiCopy';
import { colors, spacing, radius, buttonStyles, typo } from '@/lib/uiTheme';

const ANSWER_MEDIA_HEIGHT = 220;

export default function AnswerScreen() {
  const insets = useSafeAreaInsets();
  const { questionId } = useLocalSearchParams<{ questionId: string }>();
  const sheetBg = colors.background;
  const cardBg = colors.surface;
  const borderColor = colors.border;
  const selectionColor = colors.success;
  const [supabaseQuestion, setSupabaseQuestion] = useState<MockQuestion | null>(null);
  const [loading, setLoading] = useState(!!questionId && !mockQuestions.find((q) => q.id === questionId) && /^[0-9a-f-]{36}$/i.test(questionId ?? ''));
  const question = mockQuestions.find((q) => q.id === questionId) ?? supabaseQuestion;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [step, setStep] = useState<'form' | 'reward'>('form');
  const [rewardAmount, setRewardAmount] = useState(0);
  const [answerStartedAt, setAnswerStartedAt] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (question && step === 'form') {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [question, step, fadeAnim]);

  useEffect(() => {
    if (!questionId || question) return;
    if (!/^[0-9a-f-]{36}$/i.test(questionId)) return;
    (async () => {
      const row = await fetchCampaignById(questionId);
      if (row) {
        const feedQ = campaignToFeedQuestion(row);
        setSupabaseQuestion({
          id: feedQ.id,
          question: feedQ.question,
          type: feedQ.type,
          options: feedQ.options,
          reward: feedQ.reward,
          etaSeconds: feedQ.etaSeconds ?? 45,
          campaignId: feedQ.campaignId,
          creativeType: feedQ.creativeType,
          mediaUrls: feedQ.mediaUrls,
          template: feedQ.template,
        });
      }
      setLoading(false);
    })();
  }, [questionId, question]);

  useEffect(() => {
    if (question && step === 'form') setAnswerStartedAt((t) => (t == null ? Date.now() : t));
  }, [question, step]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: sheetBg }]}>
        <ActivityIndicator size="large" color={colors.success} />
      </View>
    );
  }

  if (!question) {
    return (
      <View style={[styles.container, { backgroundColor: sheetBg, padding: spacing.xl }]}>
        <Text style={typo.body}>Question introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
          <Text style={[typo.body, { color: colors.success, fontWeight: '600' }]}>Retour</Text>
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
      if (submitting) return;
      setSubmitError(null);
      setSubmitting(true);
      try {
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
      } finally {
        setSubmitting(false);
      }
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
      <View style={[styles.container, styles.rewardContainer, { paddingTop: insets.top + 48, backgroundColor: sheetBg }]} testID="answer-reward">
        <View style={[styles.rewardCard, { backgroundColor: colors.surfaceElevated }]}>
          <Text style={[typo.label, { marginBottom: spacing.sm, color: colors.success }]}>Réponse enregistrée</Text>
          <Text style={[styles.rewardCardAmount]}>+{rewardAmount.toFixed(2)} €</Text>
          <Text style={[typo.caption, { marginBottom: spacing.xl }]}>Crédité en attente de validation.</Text>
          <TouchableOpacity style={[buttonStyles.primary, { minWidth: 160 }]} onPress={handleCloseReward} testID="answer-reward-back">
            <Text style={buttonStyles.primaryText}>Retour au feed</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const optionBg = (selected: boolean) =>
    selected ? colors.successMuted : cardBg;
  const optionBorder = (selected: boolean) => (selected ? colors.success : borderColor);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: sheetBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 60}
      testID="answer-screen"
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header média : même créa que le feed pour continuité */}
          {question.creativeType && question.mediaUrls && (question.creativeType === 'image' || question.creativeType === 'video' || question.creativeType === 'comparison') && (
            <MediaStage
              creativeType={question.creativeType}
              mediaUrls={question.mediaUrls}
              height={ANSWER_MEDIA_HEIGHT}
              compact
            />
          )}
          <View style={styles.questionBlock}>
            <Text style={[typo.cardTitle, styles.questionTitle]}>{question.question}</Text>
            <View style={styles.rewardRow}>
              <Text style={typo.caption}>Récompense</Text>
              <Text style={[typo.dataSuccess, styles.rewardAmount]}>+{question.reward.toFixed(2)} €</Text>
            </View>
          </View>

          {question.type === 'text' && (
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, backgroundColor: cardBg, borderColor }]}
            value={textAnswer}
            onChangeText={setTextAnswer}
            placeholder="Votre réponse..."
            placeholderTextColor={colors.textMuted}
            selectionColor={selectionColor}
            multiline
            numberOfLines={3}
          />
        )}

        {submitError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerMuted, borderColor: colors.danger }]}>
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}
        {(question.type === 'choice' || question.type === 'poll') && question.options && (
          <>
            <Text style={[typo.caption, styles.responseTypeLabel]}>{getResponseTypeLabel(question)}</Text>
            <View style={styles.options}>
            {question.options.map((opt, index) => {
              const selected = selectedOption === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionPill,
                    { backgroundColor: optionBg(selected), borderColor: optionBorder(selected) },
                  ]}
                  onPress={() => setSelectedOption(opt)}
                  activeOpacity={0.7}
                  testID={index === 0 ? 'answer-option-0' : index === 1 ? 'answer-option-1' : undefined}
                >
                  <Text style={[typo.body, selected && styles.optionTextSelected]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          </>
        )}

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (canSend && !submitting) ? buttonStyles.primary : [buttonStyles.secondary, buttonStyles.disabled],
            ]}
            onPress={handleSend}
            disabled={!canSend || submitting}
            testID="answer-send"
          >
            <Text style={[(canSend && !submitting) ? buttonStyles.primaryText : buttonStyles.secondaryText, (!canSend || submitting) && styles.sendBtnDisabledText]}>
              {submitting ? copy.submitSending : 'Envoyer'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xl },
  scrollContent: { paddingTop: spacing.xl },
  questionBlock: { marginBottom: spacing.lg },
  questionTitle: { marginBottom: spacing.xs },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  rewardAmount: { fontSize: 16, fontWeight: '600' },
  errorBox: { padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.lg },
  errorText: { fontSize: 14, color: colors.danger },
  textInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.xl,
  },
  responseTypeLabel: { marginBottom: spacing.sm },
  options: { gap: spacing.md, marginBottom: spacing.xl },
  optionPill: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  optionTextSelected: { fontWeight: '600', color: colors.success },
  sendBtn: {
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: 48,
    marginTop: spacing.sm,
  },
  sendBtnDisabledText: { color: colors.textMuted },
  rewardContainer: { justifyContent: 'center', alignItems: 'center' },
  rewardCard: {
    borderRadius: radius.xl,
    padding: spacing.section,
    alignItems: 'center',
    minWidth: 280,
  },
  rewardCardAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.success,
    marginBottom: spacing.sm,
  },
  center: { justifyContent: 'center', alignItems: 'center' },
});
