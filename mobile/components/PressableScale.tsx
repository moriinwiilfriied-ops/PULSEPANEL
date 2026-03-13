/**
 * Press feedback premium — scale + opacity léger, très rapide, sobre.
 * Réutilisable sur CTA, quick actions, cartes importantes.
 * Pas de chewing-gum : 80ms in / 100ms out.
 */

import React, { useRef, useCallback } from 'react';
import { Pressable, Animated, StyleSheet, type ViewStyle } from 'react-native';

const PRESS_IN_DURATION = 80;
const PRESS_OUT_DURATION = 100;
const SCALE_PRESSED = 0.98;
const OPACITY_PRESSED = 0.92;

type PressableScaleProps = {
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  testID?: string;
  children: React.ReactNode;
};

export function PressableScale({ style, onPress, onPressIn, onPressOut, disabled = false, testID, children }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    Animated.parallel([
      Animated.timing(scale, {
        toValue: SCALE_PRESSED,
        duration: PRESS_IN_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: OPACITY_PRESSED,
        duration: PRESS_IN_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
    onPressIn?.();
  }, [disabled, scale, opacity, onPressIn]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: PRESS_OUT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: PRESS_OUT_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
    onPressOut?.();
  }, [scale, opacity, onPressOut]);

  const flatStyle = Array.isArray(style) ? StyleSheet.flatten(style) : style;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      testID={testID}
    >
      <Animated.View style={[flatStyle, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
