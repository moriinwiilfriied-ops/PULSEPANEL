/**
 * Feed — deck de cartes swipeables type Tinder.
 * Swipe gauche = Passer, swipe droite = Accepter → Answer.
 * Media-first : image/video/comparison = grand media stage (60%), texte = layout compact.
 * Vidéo via expo-video (expo-av déprécié).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { MediaStage } from '@/components/MediaStage';
import { type FeedQuestion } from '@/lib/mockData';
import { getResponseTypeLabel } from '@/lib/responseTypeLabels';
import { getFeedQuestionsWithSource, type FeedSource } from '@/lib/supabaseApi';
import { useAppStore } from '@/store/useAppStore';
import { feed as copy } from '@/lib/uiCopy';
import { SHOW_DEBUG_UI } from '@/lib/debugFlags';
import { colors, spacing, radius, buttonStyles, typo } from '@/lib/uiTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

// Hauteurs : media-first = grand stage, texte = compact
const CARD_HEIGHT_MEDIA = 460;
const CARD_HEIGHT_TEXT = 320;
const MEDIA_STAGE_RATIO = 0.6;
const MEDIA_STAGE_HEIGHT = Math.round(CARD_HEIGHT_MEDIA * MEDIA_STAGE_RATIO); // ~276
const BACK_CARD_BAR_HEIGHT = 48;

// Tuning premium swipe
const DISTANCE_THRESHOLD = Math.min(CARD_WIDTH * 0.28, 94);
const VELOCITY_THRESHOLD = 0.42;
const MIN_DX_FOR_VELOCITY = 20;
const RUBBER_START = 95;
const RUBBER_FACTOR = 0.42;
const SPRING_RETURN = { tension: 88, friction: 12 };
const EXIT_DURATION_MS = 135;
const ROTATION_DEG = 12;
const BACK_CARD_SCALE_BASE = 0.97;
const BACK_CARD_SCALE_DRAG = 0.995;
/** Opacité réduite pour que la carte derrière suggère sans concurrencer la carte active. */
const BACK_CARD_OPACITY_BASE = 0.26;
const BACK_CARD_OPACITY_DRAG = 0.42;
const CARD_ACTIVE_SCALE_LIFT = 1.02;
const OVERLAY_APPEAR_AT = 28;
const OVERLAY_MAX_OPACITY = 0.88;
const STACK_TOP_PADDING = 8;
const ACTIONS_TOP_PADDING = spacing.sm;

function isMediaFirst(q: FeedQuestion | undefined): boolean {
  if (!q) return false;
  return q.creativeType === 'image' || q.creativeType === 'video' || q.creativeType === 'comparison';
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const completed = useAppStore((s) => s.completed);
  const [questions, setQuestions] = useState<FeedQuestion[]>([]);
  const [feedSource, setFeedSource] = useState<FeedSource>('mock');
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setSelectedQuestion] = useState<FeedQuestion | null>(null);

  const translateX = useRef(new Animated.Value(0)).current;
  const cardEnterScale = useRef(new Animated.Value(1)).current;
  const isExiting = useRef(false);
  const runPassRef = useRef(() => {});
  const runAcceptRef = useRef(() => {});
  const rubberBandRef = useRef((dx: number) => dx);
  const finishSwipeRef = useRef((_d: 'left' | 'right') => {});

  useEffect(() => {
    if (!completed) {
      router.replace('/onboarding');
      return;
    }
  }, [completed]);

  const loadQuestions = useCallback(async () => {
    if (!completed) return;
    setFeedLoading(true);
    try {
      const res = await getFeedQuestionsWithSource();
      setFeedSource(res.source);
      setFeedError(res.error ?? null);
      setQuestions(res.items);
    } finally {
      setFeedLoading(false);
    }
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
  const nextQuestion = questions[currentIndex + 1];
  const currentIsMedia = isMediaFirst(current);
  const nextIsMedia = isMediaFirst(nextQuestion);
  const cardHeight = currentIsMedia ? CARD_HEIGHT_MEDIA : CARD_HEIGHT_TEXT;
  const backCardHeight = nextQuestion ? (nextIsMedia ? CARD_HEIGHT_MEDIA : CARD_HEIGHT_TEXT) : cardHeight;

  useEffect(() => {
    if (questions.length === 0) return;
    cardEnterScale.setValue(0.98);
    Animated.spring(cardEnterScale, {
      toValue: 1,
      tension: 140,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, questions.length, cardEnterScale]);

  const runPass = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
    }
  }, [currentIndex, questions.length]);

  const runAccept = useCallback(() => {
    if (current) {
      setSelectedQuestion(current);
      router.push(`/answer?questionId=${current.id}`);
    }
  }, [current]);

  runPassRef.current = runPass;
  runAcceptRef.current = runAccept;

  const finishSwipe = useCallback((direction: 'left' | 'right') => {
    isExiting.current = true;
    const toValue = direction === 'left' ? -SCREEN_WIDTH * 1.25 : SCREEN_WIDTH * 1.25;
    Animated.timing(translateX, {
      toValue,
      duration: EXIT_DURATION_MS,
      useNativeDriver: true,
    }).start(() => {
      translateX.setValue(0);
      isExiting.current = false;
      if (direction === 'left') runPassRef.current();
      else runAcceptRef.current();
    });
  }, [translateX]);
  finishSwipeRef.current = finishSwipe;

  const rubberBand = useCallback((dx: number) => {
    const abs = Math.abs(dx);
    if (abs <= RUBBER_START) return dx;
    const sign = dx > 0 ? 1 : -1;
    return sign * (RUBBER_START + (abs - RUBBER_START) * RUBBER_FACTOR);
  }, []);
  rubberBandRef.current = rubberBand;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isExiting.current,
      onMoveShouldSetPanResponder: (_, { dx }) => Math.abs(dx) > 6,
      onPanResponderMove: (_, { dx }) => {
        if (!isExiting.current) translateX.setValue(rubberBandRef.current(dx));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (isExiting.current) return;
        const triggerRight = dx > DISTANCE_THRESHOLD || (vx > VELOCITY_THRESHOLD && dx > MIN_DX_FOR_VELOCITY);
        const triggerLeft = dx < -DISTANCE_THRESHOLD || (vx < -VELOCITY_THRESHOLD && dx < -MIN_DX_FOR_VELOCITY);
        if (triggerRight) finishSwipeRef.current('right');
        else if (triggerLeft) finishSwipeRef.current('left');
        else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            ...SPRING_RETURN,
          }).start();
        }
      },
    })
  ).current;

  const handlePass = useCallback(() => {
    if (isExiting.current || !current) return;
    finishSwipe('left');
  }, [current, finishSwipe]);

  const handleAccept = useCallback(() => {
    if (isExiting.current || !current) return;
    finishSwipe('right');
  }, [current, finishSwipe]);

  // Réservé pour callback à connecter au retour de /answer (ex. useFocusEffect).
  const _onAnswerClosed = () => {
    setSelectedQuestion(null);
    loadQuestions();
    if (currentIndex >= questions.length - 1) setCurrentIndex(0);
    else setCurrentIndex((i) => i + 1);
  };

  if (!completed) return null;

  const emptyMessage =
    feedSource === 'supabase_error'
      ? copy.emptyLoadError
      : feedSource === 'supabase'
        ? copy.emptyNoCampaigns
        : feedSource === 'mock' && questions.length === 0
          ? copy.emptyNoBackend
          : copy.emptyMock;
  const emptySub =
    feedSource === 'supabase_error'
      ? copy.emptySubError
      : feedSource === 'mock' && questions.length === 0
        ? copy.emptySubNoBackend
        : copy.emptySubDefault;

  if (feedLoading) {
    return (
      <View style={[styles.container, styles.emptyContainer, { paddingTop: insets.top + spacing.xl, backgroundColor: colors.background }]} testID="feed-screen">
        <View style={[styles.emptyBlock, { backgroundColor: colors.surfaceElevated }]} testID="feed-loading">
          <ActivityIndicator size="large" color={colors.success} style={{ marginBottom: spacing.lg }} />
          <Text style={[typo.body, { color: colors.textSecondary }]}>{copy.loadingCampaigns}</Text>
        </View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { paddingTop: insets.top + spacing.xl, backgroundColor: colors.background }]} testID="feed-screen">
        {SHOW_DEBUG_UI && (
          <View style={styles.devPanel}>
            <Text style={styles.devLine}>
              SOURCE: {feedSource === 'supabase' ? 'SB' : feedSource === 'supabase_error' ? 'SB_ERR' : 'MOCK'}
            </Text>
            <Text style={styles.devLine}>campaigns loaded: 0</Text>
            {feedError ? <Text style={[styles.devLine, styles.devError]} numberOfLines={2}>last error: {feedError}</Text> : null}
          </View>
        )}
        <View style={[styles.emptyBlock, { backgroundColor: colors.surfaceElevated }]} testID="feed-empty">
          <Text style={[styles.emptyTitle]}>{emptyMessage}</Text>
          <Text style={[typo.caption, styles.emptySub]}>{emptySub}</Text>
        </View>
      </View>
    );
  }

  const rotate = translateX.interpolate({
    inputRange: [-CARD_WIDTH * 0.6, 0, CARD_WIDTH * 0.6],
    outputRange: [`-${ROTATION_DEG}deg`, '0deg', `${ROTATION_DEG}deg`],
    extrapolate: 'clamp',
  });
  const cardActiveScale = translateX.interpolate({
    inputRange: [-CARD_WIDTH, -30, 0, 30, CARD_WIDTH],
    outputRange: [CARD_ACTIVE_SCALE_LIFT, CARD_ACTIVE_SCALE_LIFT, 1, CARD_ACTIVE_SCALE_LIFT, CARD_ACTIVE_SCALE_LIFT],
    extrapolate: 'clamp',
  });
  const leftOverlayOpacity = translateX.interpolate({
    inputRange: [-CARD_WIDTH, -DISTANCE_THRESHOLD, -OVERLAY_APPEAR_AT, 0],
    outputRange: [OVERLAY_MAX_OPACITY, OVERLAY_MAX_OPACITY * 0.82, 0.28, 0],
    extrapolate: 'clamp',
  });
  const rightOverlayOpacity = translateX.interpolate({
    inputRange: [0, OVERLAY_APPEAR_AT, DISTANCE_THRESHOLD, CARD_WIDTH],
    outputRange: [0, 0.28, OVERLAY_MAX_OPACITY * 0.82, OVERLAY_MAX_OPACITY],
    extrapolate: 'clamp',
  });
  const backCardScale = translateX.interpolate({
    inputRange: [-CARD_WIDTH, -60, 0, 60, CARD_WIDTH],
    outputRange: [BACK_CARD_SCALE_DRAG, BACK_CARD_SCALE_DRAG, BACK_CARD_SCALE_BASE, BACK_CARD_SCALE_DRAG, BACK_CARD_SCALE_DRAG],
    extrapolate: 'clamp',
  });
  const backCardOpacity = translateX.interpolate({
    inputRange: [-CARD_WIDTH, -80, 0, 80, CARD_WIDTH],
    outputRange: [BACK_CARD_OPACITY_DRAG, BACK_CARD_OPACITY_DRAG, BACK_CARD_OPACITY_BASE, BACK_CARD_OPACITY_DRAG, BACK_CARD_OPACITY_DRAG],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl, backgroundColor: colors.background }]} testID="feed-screen">
      {SHOW_DEBUG_UI && (
        <View style={styles.devPanel}>
          <Text style={styles.devLine}>
            SOURCE: {feedSource === 'supabase' ? 'SB' : feedSource === 'supabase_error' ? 'SB_ERR' : 'MOCK'}
          </Text>
          <Text style={styles.devLine}>campaigns loaded: {questions.length}</Text>
          {feedError ? <Text style={[styles.devLine, styles.devError]} numberOfLines={2}>last error: {feedError}</Text> : null}
        </View>
      )}

      <Text style={[typo.caption, styles.feedSubtitle]} numberOfLines={1}>Répondez en un geste</Text>

      <View style={[styles.stack, { paddingTop: STACK_TOP_PADDING, minHeight: Math.max(CARD_HEIGHT_MEDIA, CARD_HEIGHT_TEXT) + 24 }]}>
        {/* Carte du dessous (deck) — rendu simplifié : barre + question + meta visibles, pas de grand rectangle vide */}
        {nextQuestion && (
          <Animated.View
            style={[
              styles.card,
              styles.cardBehind,
              {
                width: CARD_WIDTH,
                height: backCardHeight,
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderStrong,
                borderWidth: 1.5,
                transform: [{ scale: backCardScale }],
                opacity: backCardOpacity,
              },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.backCardBar, { height: BACK_CARD_BAR_HEIGHT }]} />
            <Text style={[styles.cardBehindQuestion]} numberOfLines={1}>
              {nextQuestion.questionText || 'Question (à définir)'}
            </Text>
            <View style={styles.cardMeta}>
              <Text style={styles.cardBehindMeta}>{getResponseTypeLabel(nextQuestion)}</Text>
              <Text style={styles.cardBehindMeta}>+{nextQuestion.reward.toFixed(2)} €</Text>
            </View>
          </Animated.View>
        )}

        <View style={[styles.cardSlot, { height: cardHeight }]} {...panResponder.panHandlers}>
          <Animated.View style={[styles.overlayLeft, { opacity: leftOverlayOpacity }]} pointerEvents="none">
            <View style={styles.overlayCapsule}>
              <Text style={styles.overlayLabel} numberOfLines={1}>PASSER</Text>
            </View>
          </Animated.View>
          <Animated.View style={[styles.overlayRight, { opacity: rightOverlayOpacity }]} pointerEvents="none">
            <View style={styles.overlayCapsuleAccept}>
              <Text style={styles.overlayLabelAccept} numberOfLines={1}>ACCEPTER</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              styles.cardTop,
              styles.cardHero,
              {
                width: CARD_WIDTH,
                height: cardHeight,
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
                transform: [{ translateX }, { rotate }, { scale: Animated.multiply(cardActiveScale, cardEnterScale) }],
              },
            ]}
          >
            {/* Media-first : grand stage (60%) — composant partagé avec answer */}
            {currentIsMedia && (
              current.creativeType && current.mediaUrls && (current.creativeType === 'image' || current.creativeType === 'video' || current.creativeType === 'comparison') ? (
                <MediaStage creativeType={current.creativeType} mediaUrls={current.mediaUrls} height={MEDIA_STAGE_HEIGHT} />
              ) : (
                <View style={[styles.mediaStage, { height: MEDIA_STAGE_HEIGHT }]}>
                  <View style={[styles.mediaStageInner, styles.videoFallback, { height: MEDIA_STAGE_HEIGHT }]}>
                    <Text style={[typo.muted, styles.videoFallbackText]}>Média</Text>
                  </View>
                </View>
              )
            )}

            {/* Texte seul : pas de media stage (layout compact) ou petit placeholder optionnel */}
            {!currentIsMedia && current.imagePlaceholder ? (
              <View style={[styles.textCardPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[typo.muted, styles.imagePlaceholderText]}>{current.imagePlaceholder}</Text>
              </View>
            ) : null}

            {SHOW_DEBUG_UI && (
              <View style={styles.badgeWrap}>
                <View style={[styles.badge, current.source === 'supabase' ? styles.badgeSb : styles.badgeMock]}>
                  <Text style={styles.badgeText}>{current.source === 'supabase' ? 'SB' : 'MOCK'}</Text>
                </View>
              </View>
            )}
            <Text
              style={[typo.cardTitle, styles.cardQuestion]}
              numberOfLines={4}
              ellipsizeMode="tail"
            >
              {current.questionText || 'Question (à définir)'}
            </Text>
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaType}>{getResponseTypeLabel(current)}</Text>
              <Text style={styles.cardReward}>+{current.reward.toFixed(2)} €</Text>
              <Text style={styles.cardMetaDuration}>~{current.etaSeconds}s</Text>
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={[styles.actions, { paddingTop: ACTIONS_TOP_PADDING }]}>
        <TouchableOpacity style={[buttonStyles.secondary, styles.btnPass]} onPress={handlePass} activeOpacity={0.8}>
          <Text style={buttonStyles.secondaryText}>Passer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[buttonStyles.primary, styles.btnAccept]} onPress={handleAccept} activeOpacity={0.8} testID="feed-accept">
          <Text style={buttonStyles.primaryText}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl },
  emptyContainer: { justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyBlock: {
    borderRadius: radius.xl,
    padding: spacing.section,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptySub: { textAlign: 'center', color: colors.textSecondary, lineHeight: 20 },
  feedSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  devPanel: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,100,136,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0,100,136,0.4)',
  },
  devLine: { fontSize: 11, fontFamily: 'monospace', color: colors.textSecondary },
  devError: { color: colors.danger, marginTop: spacing.xs },
  stack: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  cardSlot: {
    position: 'absolute',
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
  },
  cardTop: { zIndex: 2 },
  cardHero: {
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  cardBehind: { zIndex: 1 },
  backCardBar: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    marginHorizontal: -spacing.xl,
    marginTop: -spacing.xl,
    marginBottom: spacing.sm,
  },
  cardBehindQuestion: {
    marginBottom: spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  cardBehindMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardQuestion: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  cardMetaType: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  cardMetaDuration: { fontSize: 11, color: colors.textMuted },
  overlayLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 108,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    backgroundColor: 'rgba(185,28,28,0.22)',
    borderWidth: 2,
    borderRightWidth: 0,
    borderColor: 'rgba(220,38,38,0.52)',
  },
  overlayRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 118,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    backgroundColor: 'rgba(22,163,74,0.22)',
    borderWidth: 2,
    borderLeftWidth: 0,
    borderColor: 'rgba(34,197,94,0.52)',
  },
  overlayCapsule: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    minWidth: 88,
    alignItems: 'center',
  },
  overlayCapsuleAccept: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    minWidth: 96,
    alignItems: 'center',
  },
  overlayLabel: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.98)', letterSpacing: 0.8 },
  overlayLabelAccept: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.98)', letterSpacing: 0.8 },
  mediaStage: {
    marginHorizontal: -spacing.xl,
    marginTop: -spacing.xl,
    marginBottom: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  mediaStageInner: {
    width: '100%',
    borderRadius: 0,
  },
  videoFallback: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoFallbackText: { fontSize: 14 },
  textCardPlaceholder: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  imagePlaceholderText: {},
  badgeWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  badgeSb: { backgroundColor: colors.trustMuted, borderWidth: 1, borderColor: colors.trust },
  badgeMock: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: colors.border },
  badgeText: { color: colors.textPrimary, fontSize: 11, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', alignItems: 'center' },
  cardReward: { fontSize: 14, fontWeight: '700', color: colors.success },
  actions: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
  btnPass: { flex: 1, maxWidth: 160 },
  btnAccept: { flex: 1, maxWidth: 160 },
});
