/**
 * Design system mobile dark premium — PulsePanel 2026
 * Nuancé, lisible, cohérent Expo Go. Pas de dépendance exotique.
 */

import { StyleSheet, ViewStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  /** Respiration éditoriale (hero, empty, reward) */
  section: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Palette dark premium 2026 — charcoal / smoke, plus de lumière, identité affirmée */
export const colors = {
  background: '#18181b',
  surface: '#222226',
  surfaceElevated: '#2a2a30',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.1)',
  textPrimary: '#f4f4f5',
  textSecondary: '#b4b4bc',
  textMuted: '#71717a',
  success: '#22b84a',
  successMuted: 'rgba(34,184,74,0.2)',
  warning: '#d4a84a',
  warningMuted: 'rgba(212,168,74,0.2)',
  danger: '#e5484d',
  dangerMuted: 'rgba(229,72,77,0.18)',
  trust: '#d4a84a',
  trustMuted: 'rgba(212,168,74,0.2)',
  tint: '#f4f4f5',
  tabIconDefault: '#71717a',
  tabIconSelected: '#f4f4f5',
  /** Wallet — fond et surfaces plus riches, solde plus premium (emerald) */
  walletBackground: '#1c1c20',
  walletSurface: '#25252a',
  walletSurfaceElevated: '#2e2e34',
  walletBalance: '#2dd4a0',
  walletBalanceMuted: 'rgba(45,212,160,0.22)',
  walletBorder: 'rgba(255,255,255,0.07)',
} as const;

/** Styles de cartes réutilisables */
export const cardStyles = {
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  } as ViewStyle,
};

/** Styles de badges (statut) — discrets, premium */
export const badgeStyles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  success: {
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(34,184,74,0.45)',
  },
  warning: {
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: 'rgba(212,168,74,0.45)',
  },
  danger: {
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.45)',
  },
  neutral: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
});

/** Styles de boutons */
export const buttonStyles = StyleSheet.create({
  primary: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    minHeight: 48,
  },
  primaryText: {
    color: '#0d0d0f',
    fontSize: 16,
    fontWeight: '600',
  },
  secondary: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.45,
  },
});

/** Titres et textes — hiérarchie premium */
export const typo = StyleSheet.create({
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  muted: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dataLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dataSuccess: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.success,
  },
});

/** Container écran standard (padding + safe area à appliquer en plus) */
export const screenContainer = {
  flex: 1,
  paddingHorizontal: spacing.xl,
} as ViewStyle;
