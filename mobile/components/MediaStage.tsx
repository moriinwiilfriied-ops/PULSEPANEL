/**
 * MediaStage — bloc média partagé feed + answer.
 * Affiche image, vidéo (muted, loop, badge VIDÉO, hint play) ou comparison A/B.
 * Utilisé pour la continuité media-first feed → answer.
 */

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Image, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Text } from '@/components/Themed';
import { type CreativeType, type FeedMediaUrls } from '@/lib/mockData';
import { colors, spacing, radius, typo } from '@/lib/uiTheme';

export interface MediaStageProps {
  creativeType: CreativeType;
  mediaUrls: FeedMediaUrls;
  height: number;
  /** Optionnel : pas de margin négative (pour answer). */
  compact?: boolean;
}

function VideoBlock({ uri, containerHeight }: { uri: string; containerHeight: number }) {
  const [error, setError] = useState(false);
  const playHintOpacity = useRef(new Animated.Value(1)).current;
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ error: err }) => {
      if (err) setError(true);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(playHintOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 900);
    return () => clearTimeout(t);
  }, [playHintOpacity]);

  if (error) {
    return (
      <View style={[styles.mediaStageInner, styles.videoFallback, { height: containerHeight }]}>
        <Text style={[typo.muted, styles.videoFallbackText]}>Vidéo</Text>
      </View>
    );
  }

  return (
    <View style={[styles.mediaStageInner, { height: containerHeight, overflow: 'hidden' }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.videoBadge} pointerEvents="none">
        <Text style={styles.videoBadgeText}>VIDÉO</Text>
      </View>
      <Animated.View style={[styles.videoPlayHint, { opacity: playHintOpacity }]} pointerEvents="none">
        <View style={styles.videoPlayHintCircle}>
          <View style={styles.videoPlayHintTriangle} />
        </View>
      </Animated.View>
    </View>
  );
}

export function MediaStage({ creativeType, mediaUrls, height, compact }: MediaStageProps) {
  if (creativeType === 'text') return null;
  const hasImage = creativeType === 'image' && mediaUrls.primary;
  const hasVideo = creativeType === 'video' && mediaUrls.primary;
  const hasComparison =
    creativeType === 'comparison' && (mediaUrls.comparisonA || mediaUrls.comparisonB);
  if (!hasImage && !hasVideo && !hasComparison) return null;

  const wrapStyle = compact ? [styles.mediaStageCompact, { marginBottom: spacing.lg }] : styles.mediaStage;

  if (hasImage) {
    return (
      <View style={[wrapStyle, { height }]}>
        <View style={[styles.mediaStageInner, { height }]}>
          <Image
            source={{ uri: mediaUrls.primary }}
            style={styles.mediaImageFill}
            resizeMode="cover"
          />
        </View>
      </View>
    );
  }

  if (hasVideo) {
    return (
      <View style={[wrapStyle, { height }]}>
        <VideoBlock uri={mediaUrls.primary!} containerHeight={height} />
      </View>
    );
  }

  if (hasComparison) {
    return (
      <View style={[wrapStyle, { height }]}>
        <View style={[styles.comparisonRow, { height }]}>
          <View style={[styles.comparisonHalf, { backgroundColor: colors.surfaceElevated }]}>
            {mediaUrls.comparisonA ? (
              <Image source={{ uri: mediaUrls.comparisonA }} style={styles.mediaImageFill} resizeMode="cover" />
            ) : (
              <Text style={[typo.muted, styles.comparisonLabel]}>A</Text>
            )}
          </View>
          <View style={[styles.comparisonHalf, { backgroundColor: colors.surfaceElevated }]}>
            {mediaUrls.comparisonB ? (
              <Image source={{ uri: mediaUrls.comparisonB }} style={styles.mediaImageFill} resizeMode="cover" />
            ) : (
              <Text style={[typo.muted, styles.comparisonLabel]}>B</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  mediaStage: {
    marginHorizontal: -spacing.xl,
    marginTop: -spacing.xl,
    marginBottom: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  mediaStageCompact: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  mediaStageInner: {
    width: '100%',
    borderRadius: 0,
  },
  mediaImageFill: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  videoFallback: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoFallbackText: { fontSize: 14 },
  videoBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  videoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.98)',
    letterSpacing: 0.4,
  },
  videoPlayHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayHintCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayHintTriangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(255,255,255,0.95)',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 0,
  },
  comparisonHalf: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonLabel: { fontSize: 14 },
});
