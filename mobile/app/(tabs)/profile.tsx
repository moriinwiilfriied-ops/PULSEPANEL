/**
 * Profil — Compte, Ciblage, Notifications, Localisation, Stats.
 * Trust depuis DB. Données compte (email, nom) et préférences (local + API).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  Switch,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { useAppStore, getAppStore } from '@/store/useAppStore';
import { supabase, ensureAnonSession } from '@/lib/supabase';
import {
  isSupabaseConfigured,
  fetchUserTrust,
  fetchUserDailyLimitStatus,
  fetchUserProfile,
  upsertUserOnboarding,
  setNotificationPreferencesBackend,
  type UserTrustRow,
  type UserDailyLimitStatus,
  type UserProfileRow,
} from '@/lib/supabaseApi';
import { wallet as copyWallet, profile as copyProfile } from '@/lib/uiCopy';
import {
  getDisplayName,
  setDisplayName,
  getAvatarUri,
  setAvatarUri,
  getNotificationPreferences,
  setNotificationPreferences,
  getLocationPreferences,
  setLocationPreferences,
  type NotificationPreferences,
  type LocationPreferences,
} from '@/lib/profilePreferences';
import { requestNotificationPermission, getNotificationPermissionStatus, type NotificationPermissionStatus } from '@/lib/notificationHelpers';
import { requestLocationPermission, getCurrentLocationOnce } from '@/lib/locationHelpers';
import { registerPushTokenNow } from '@/lib/deviceRegistration';
import { colors, spacing, radius } from '@/lib/uiTheme';
import { PressableScale } from '@/components/PressableScale';

const TAGS = ['Tech', 'Mode', 'Alimentation', 'Sport', 'Voyage', 'Culture', 'Santé', 'Finance'];
const AGE_BUCKETS = ['18-24', '25-34', '35-44', '45+'];

/** Apparition douce du hero au montage — fade 220ms, sobre. */
function HeroFadeIn({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

function getTrustColor(level: string) {
  switch (level) {
    case 'Or': return colors.trust;
    case 'Argent': return colors.textSecondary;
    case 'Bronze': return colors.warning;
    default: return colors.textMuted;
  }
}

function getDisplayTrust(trustFromDb: UserTrustRow | null): { label: string; color: string } {
  const level = trustFromDb?.trust_level?.trim();
  if (level) return { label: level, color: getTrustColor(level) };
  return { label: 'En cours de calcul', color: colors.textMuted };
}

function getInitials(displayName: string | null, email: string | null): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName.trim().slice(0, 2).toUpperCase();
  }
  if (email?.trim()) return email.trim().slice(0, 2).toUpperCase();
  return '?';
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { history, pending, available, age, region, tags, setOnboarding } = useAppStore();
  const [authUser, setAuthUser] = useState<{ email: string | null; emailVerified?: boolean } | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [avatarUri, setAvatarUriState] = useState<string | null>(null);
  const [notifPermissionStatus, setNotifPermissionStatus] = useState<NotificationPermissionStatus>('unavailable');
  const [trustFromDb, setTrustFromDb] = useState<UserTrustRow | null>(null);
  const [dailyStatus, setDailyStatus] = useState<UserDailyLimitStatus | null>(null);
  const [profileRow, setProfileRow] = useState<UserProfileRow | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    enabled: false,
    newCampaigns: true,
    walletUpdates: true,
    reminders: false,
  });
  const [locationPrefs, setLocationPrefs] = useState<LocationPreferences>({
    enabled: false,
    city: null,
    department: null,
    region: null,
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [editingCiblage, setEditingCiblage] = useState(false);
  const [editAgeBucket, setEditAgeBucket] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [savingCiblage, setSavingCiblage] = useState(false);
  const [heroSheetVisible, setHeroSheetVisible] = useState(false);
  const [sheetDisplayName, setSheetDisplayName] = useState('');
  const [photoPickerLoading, setPhotoPickerLoading] = useState(false);

  const loadAll = useCallback(async () => {
    const [trust, daily, profile, name, avatar, notif, loc, notifStatus] = await Promise.all([
      isSupabaseConfigured() ? fetchUserTrust() : Promise.resolve(null),
      isSupabaseConfigured() ? fetchUserDailyLimitStatus() : Promise.resolve(null),
      isSupabaseConfigured() ? fetchUserProfile() : Promise.resolve(null),
      getDisplayName(),
      getAvatarUri(),
      getNotificationPreferences(),
      getLocationPreferences(),
      getNotificationPermissionStatus(),
    ]);
    setTrustFromDb(trust ?? null);
    setDailyStatus(daily ?? null);
    setProfileRow(profile ?? null);
    setDisplayNameState(name);
    setAvatarUriState(avatar);
    setNotifPrefs(notif);
    setLocationPrefs(loc);
    setNotifPermissionStatus(notifStatus);
    if (profile) {
      setEditAgeBucket(profile.age_bucket ?? '');
      setEditRegion(profile.region ?? '');
      setEditTags(profile.tags ?? []);
    }
    const { data: { user } } = await supabase.auth.getUser();
    const u = user as { email?: string | null; email_confirmed_at?: string | null } | null;
    setAuthUser(u ? { email: u.email ?? null, emailVerified: !!u.email_confirmed_at } : null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  // Précharger expo-image-picker à l'ouverture de la sheet pour éviter le délai au premier clic
  useEffect(() => {
    if (heroSheetVisible) {
      import('expo-image-picker').catch(() => {});
    }
  }, [heroSheetVisible]);

  const totalResponses = history.length;
  const totalEarnings = history.reduce((sum, h) => sum + h.reward, 0);
  const { label: trustLabel, color: trustColor } = getDisplayTrust(trustFromDb);

  const handleSaveDisplayName = useCallback(async (name: string) => {
    const trimmed = name.trim() || null;
    setDisplayNameState(trimmed);
    await setDisplayName(trimmed);
  }, []);

  const handleNotifToggle = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...notifPrefs, [key]: value };
    if (key === 'enabled' && value) {
      const granted = await requestNotificationPermission();
      if (!granted) next.enabled = false;
      setNotifPermissionStatus(await getNotificationPermissionStatus());
    }
    setNotifPrefs(next);
    await setNotificationPreferences(next);
    if (isSupabaseConfigured()) {
      setNotificationPreferencesBackend({
        walletUpdates: next.walletUpdates,
        newCampaigns: next.newCampaigns,
      }).catch(() => {});
      registerPushTokenNow().catch(() => {});
    }
  }, [notifPrefs]);

  const handleLocationToggle = useCallback(async (value: boolean) => {
    if (value) {
      setLocationLoading(true);
      const granted = await requestLocationPermission();
      if (!granted) {
        setLocationLoading(false);
        return;
      }
      const geo = await getCurrentLocationOnce();
      const next: LocationPreferences = {
        enabled: true,
        city: geo.city,
        department: geo.department,
        region: geo.region,
      };
      setLocationPrefs(next);
      await setLocationPreferences(next);
      setLocationLoading(false);
    } else {
      const next: LocationPreferences = { enabled: false, city: null, department: null, region: null };
      setLocationPrefs(next);
      await setLocationPreferences(next);
    }
  }, []);

  const toggleEditTag = (tag: string) => {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveCiblage = useCallback(async () => {
    setSavingCiblage(true);
    const ageBucket = AGE_BUCKETS.includes(editAgeBucket) ? editAgeBucket : '25-34';
    const regionVal = editRegion.trim() || null;
    if (isSupabaseConfigured()) {
      await upsertUserOnboarding({ ageBucket, region: regionVal, tags: editTags });
    }
    const ageNum = ageBucket === '18-24' ? 22 : ageBucket === '25-34' ? 28 : ageBucket === '35-44' ? 38 : 50;
    setOnboarding(ageNum, regionVal, editTags);
    setProfileRow({ age_bucket: ageBucket, region: regionVal, tags: editTags });
    setEditingCiblage(false);
    setSavingCiblage(false);
  }, [editAgeBucket, editRegion, editTags, setOnboarding]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Hero identité — tappable, apparition douce, feedback premium */}
      <HeroFadeIn>
        <PressableScale
          style={[styles.heroIdentity, { backgroundColor: colors.surfaceElevated, borderColor: colors.walletBorder }]}
          onPress={() => {
            setSheetDisplayName(displayName ?? '');
            setHeroSheetVisible(true);
          }}
        >
          <View style={styles.heroIdentityTop}>
            <View style={[styles.avatarLarge, { backgroundColor: colors.surface, overflow: 'hidden' }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLargeText}>{getInitials(displayName, authUser?.email ?? null)}</Text>
              )}
            </View>
            <View style={styles.heroIdentityMain}>
              <Text style={[styles.heroDisplayName, { color: colors.textPrimary }]} numberOfLines={1}>
                {displayName?.trim() || copyProfile.displayNamePlaceholder}
              </Text>
              <Text style={styles.heroEmail} numberOfLines={1}>{authUser?.email || copyProfile.emailAnonymous}</Text>
              {authUser?.email && (
                <Text style={[styles.heroEmailVerified, { color: authUser.emailVerified ? colors.success : colors.warning }]} numberOfLines={1}>
                  {authUser.emailVerified ? copyProfile.emailVerified : copyProfile.emailNotVerified}
                </Text>
              )}
              <View style={styles.heroTrustRow}>
                <View style={[styles.trustBadge, { borderColor: trustColor }]}>
                  <Text style={[styles.trustBadgeText, { color: trustColor }]}>{trustLabel}</Text>
                </View>
                {trustFromDb?.trust_score != null && (
                  <Text style={styles.heroScoreInline}> · {trustFromDb.trust_score} pts</Text>
                )}
              </View>
            </View>
          </View>
        </PressableScale>
      </HeroFadeIn>

      {/* Sheet Mon compte — Identité, Photo, Confiance */}
      <Modal
        visible={heroSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHeroSheetVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setHeroSheetVisible(false)}>
          <Pressable style={[styles.heroSheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.walletBorder }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.heroSheetHandle} />
            <ScrollView
              style={styles.heroSheetScroll}
              contentContainerStyle={styles.heroSheetScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={[styles.heroSheetTitle, { color: colors.textPrimary }]}>{copyProfile.heroSheetTitle}</Text>

            {/* Bloc Identité */}
            <Text style={[styles.heroSheetSectionTitle, { color: colors.textSecondary }]}>{copyProfile.sectionAccount}</Text>
            {authUser?.email && (
              <View style={[styles.heroSheetEmailRow, { marginBottom: spacing.md }]}>
                <Text style={[styles.heroSheetLabel, { color: colors.textSecondary }]}>{copyProfile.emailLabel}</Text>
                <Text style={[styles.heroSheetEmailValue, { color: colors.textPrimary }]}>{authUser.email}</Text>
                <Text style={[styles.heroSheetEmailVerified, { color: authUser.emailVerified ? colors.success : colors.warning }]}>{authUser.emailVerified ? copyProfile.emailVerified : copyProfile.emailNotVerified}</Text>
              </View>
            )}
            <Text style={[styles.heroSheetLabel, { color: colors.textSecondary }]}>{copyProfile.displayNameLabel}</Text>
            <TextInput
              style={[styles.heroSheetInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={sheetDisplayName}
              onChangeText={setSheetDisplayName}
              placeholder={copyProfile.displayNamePlaceholder}
              placeholderTextColor={colors.textMuted}
            />

            {/* Bloc Photo */}
            <Text style={[styles.heroSheetSectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>{copyProfile.heroSheetPhotoLabel}</Text>
            <View style={[styles.heroSheetAvatarWrap, { backgroundColor: colors.surface }]}>
              <View style={[styles.avatarLarge, { backgroundColor: colors.surface, overflow: 'hidden' }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarLargeText}>{getInitials(displayName, authUser?.email ?? null)}</Text>
                )}
              </View>
              <View style={styles.heroSheetPhotoActions}>
                <TouchableOpacity
                  style={[styles.photoActionBtn, { borderColor: colors.border }]}
                  onPress={async () => {
                    setPhotoPickerLoading(true);
                    try {
                      const { launchImageLibraryAsync } = await import('expo-image-picker');
                      const result = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1] });
                      if (!result.canceled && result.assets?.[0]?.uri) {
                        const uri = result.assets[0].uri;
                        await setAvatarUri(uri);
                        setAvatarUriState(uri);
                      }
                    } catch {
                      // ignore
                    } finally {
                      setPhotoPickerLoading(false);
                    }
                  }}
                  disabled={photoPickerLoading}
                >
                  {photoPickerLoading ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : (
                    <Text style={[styles.photoActionBtnText, { color: colors.textSecondary }]}>{copyProfile.photoChange}</Text>
                  )}
                </TouchableOpacity>
                {avatarUri && !photoPickerLoading && (
                  <TouchableOpacity
                    style={[styles.photoActionBtn, { borderColor: colors.danger }]}
                    onPress={async () => {
                      await setAvatarUri(null);
                      setAvatarUriState(null);
                    }}
                  >
                    <Text style={[styles.photoActionBtnText, { color: colors.danger }]}>{copyProfile.photoRemove}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Bloc Confiance / Badge */}
            <View style={[styles.badgeExplanationBlock, { borderColor: colors.walletBorder }]}>
              <Text style={[styles.badgeExplanationTitle, { color: colors.textPrimary }]}>{copyProfile.badgeSectionTitle}</Text>
              <View style={styles.heroTrustRow}>
                <View style={[styles.trustBadge, { borderColor: trustColor }]}>
                  <Text style={[styles.trustBadgeText, { color: trustColor }]}>{trustLabel}</Text>
                </View>
                {trustFromDb?.trust_score != null && (
                  <Text style={[styles.heroScoreInline, { color: colors.textSecondary }]}> · {trustFromDb.trust_score} pts</Text>
                )}
              </View>
              <Text style={[styles.badgeExplanationText, { color: colors.textSecondary }]}>{copyProfile.badgeBronzeExplanation}</Text>
              <Text style={[styles.badgeExplanationText, { color: colors.textSecondary }]}>{copyProfile.badgeScoreExplanation}</Text>
              <Text style={[styles.badgeExplanationText, { color: colors.textSecondary }]}>{copyProfile.badgeProgressExplanation}</Text>
            </View>

            <View style={styles.heroSheetActions}>
              <PressableScale
                style={[styles.heroSheetSaveBtn, { backgroundColor: colors.walletBalance }]}
                onPress={() => {
                  handleSaveDisplayName(sheetDisplayName);
                  setDisplayNameState(sheetDisplayName.trim() || null);
                  setHeroSheetVisible(false);
                }}
              >
                <Text style={styles.heroSheetSaveBtnText}>{copyProfile.save}</Text>
              </PressableScale>
              <PressableScale style={[styles.heroSheetCloseBtn, { borderColor: colors.border }]} onPress={() => setHeroSheetVisible(false)}>
                <Text style={[styles.heroSheetCloseBtnText, { color: colors.textSecondary }]}>Fermer</Text>
              </PressableScale>
            </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 2. Ciblage — sobre, labels à gauche / valeurs à droite */}
      <Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>{copyProfile.sectionTargeting}</Text>
      <View style={[styles.lightBlock, { borderColor: colors.walletBorder }]}>
        {!editingCiblage ? (
          <>
            <View style={styles.ciblageRow}>
              <Text style={styles.compactLabel}>{copyProfile.ageLabel}</Text>
              <Text style={[styles.compactValue, styles.ciblageValue]}>{profileRow?.age_bucket ?? (age != null ? (age < 25 ? '18-24' : age < 35 ? '25-34' : age < 45 ? '35-44' : '45+') : '—')}</Text>
            </View>
            <View style={[styles.ciblageDivider, { backgroundColor: colors.border }]} />
            <View style={styles.ciblageRow}>
              <Text style={styles.compactLabel}>{copyProfile.regionLabel}</Text>
              <Text style={[styles.compactValue, styles.ciblageValue]} numberOfLines={1}>{profileRow?.region || region || '—'}</Text>
            </View>
            <View style={[styles.ciblageDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.compactLabel, { marginBottom: spacing.xs }]}>{copyProfile.interestsLabel}</Text>
            <View style={styles.interestsWrap}>
              {(profileRow?.tags?.length ? profileRow.tags : tags?.length ? tags : []).length ? (
                (profileRow?.tags?.length ? profileRow.tags : tags).map((t) => (
                  <View key={t} style={[styles.miniChip, { backgroundColor: colors.walletBalanceMuted }]}>
                    <Text style={styles.miniChipText}>{t}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.compactValue, styles.ciblageValue]}>{'—'}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditingCiblage(true)}>
              <Text style={styles.editBtnText}>{copyProfile.edit}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.compactLabel}>{copyProfile.ageLabel}</Text>
            <View style={styles.chipRow}>
              {AGE_BUCKETS.map((b) => (
                <TouchableOpacity key={b} style={[styles.chip, editAgeBucket === b && styles.chipSelected, { borderColor: colors.border }]} onPress={() => setEditAgeBucket(b)}>
                  <Text style={[styles.chipText, editAgeBucket === b && { color: colors.textPrimary }]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.compactLabel, { marginTop: spacing.md }]}>{copyProfile.regionLabel}</Text>
            <TextInput style={[styles.shortInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]} value={editRegion} onChangeText={setEditRegion} placeholder="Ex: Île-de-France" placeholderTextColor={colors.textMuted} />
            <Text style={[styles.compactLabel, { marginTop: spacing.md }]}>{copyProfile.interestsLabel}</Text>
            <View style={styles.chipRow}>
              {TAGS.map((tag) => (
                <TouchableOpacity key={tag} style={[styles.chip, editTags.includes(tag) && styles.chipSelected, { borderColor: colors.border }]} onPress={() => toggleEditTag(tag)}>
                  <Text style={[styles.chipText, editTags.includes(tag) && { color: colors.textPrimary }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setEditingCiblage(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCiblage} disabled={savingCiblage}>
                {savingCiblage ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={styles.saveBtnText}>{copyProfile.save}</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* 3. Performance — avant Préférences pour ordre logique */}
      <Text style={styles.sectionLabel}>Performance</Text>
      <View style={[styles.performanceBlock, { borderColor: colors.walletBorder }]}>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>Réponses</Text>
          <Text style={styles.performanceValue}>{totalResponses}</Text>
        </View>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>Gains total</Text>
          <Text style={[styles.performanceValue, { color: colors.walletBalance }]}>{totalEarnings.toFixed(2)} €</Text>
        </View>
        <View style={[styles.performanceDivider, { backgroundColor: colors.border }]} />
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>{copyWallet.pendingLabel}</Text>
          <Text style={styles.performanceValue}>{pending.toFixed(2)} €</Text>
        </View>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>{copyWallet.availableLabel}</Text>
          <Text style={[styles.performanceValue, { color: colors.walletBalance }]}>{available.toFixed(2)} €</Text>
        </View>
        {dailyStatus && (
          <>
            <View style={[styles.performanceDivider, { backgroundColor: colors.border }]} />
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>{'Aujourd\'hui'}</Text>
              <Text style={styles.performanceValue}>{dailyStatus.valid_responses_today}/{dailyStatus.max_valid_responses_per_day} · {(dailyStatus.reward_cents_today / 100).toFixed(2)} €</Text>
            </View>
          </>
        )}
      </View>

      {/* 4. Préférences — notifications + localisation */}
      <Text style={styles.sectionLabel}>Préférences</Text>
      <View style={[styles.lightBlock, { borderColor: colors.walletBorder }]}>
        <Text style={styles.subSectionLabel}>{copyProfile.sectionNotifications}</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{copyProfile.notifGlobal}</Text>
          <View style={styles.toggleRight}>
            <Text style={[styles.notifStatusBadge, { color: notifPermissionStatus === 'granted' ? colors.success : notifPermissionStatus === 'denied' ? colors.warning : colors.textMuted }]}>
              {notifPermissionStatus === 'granted' ? copyProfile.notifStatusEnabled : notifPermissionStatus === 'denied' ? copyProfile.notifStatusDenied : copyProfile.notifStatusUnavailable}
            </Text>
            <Switch
              value={notifPrefs.enabled}
              onValueChange={(v) => handleNotifToggle('enabled', v)}
              trackColor={{ false: colors.border, true: colors.walletBalance }}
              thumbColor={colors.textPrimary}
              disabled={notifPermissionStatus === 'unavailable'}
            />
          </View>
        </View>
        {notifPermissionStatus === 'unavailable' && (
          <Text style={styles.hint}>{copyProfile.notifUnavailableHint}</Text>
        )}
        {notifPermissionStatus === 'denied' && (
          <>
            <Text style={styles.hint}>{copyProfile.notifDeniedHint}</Text>
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openSettings()}>
              <Text style={[styles.linkBtnText, { color: colors.walletBalance }]}>{copyProfile.notifOpenSettings}</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabelSmall}>{copyProfile.notifNewCampaigns}</Text>
          <Switch value={notifPrefs.newCampaigns} onValueChange={(v) => handleNotifToggle('newCampaigns', v)} trackColor={{ false: colors.border, true: colors.walletBalance }} thumbColor={colors.textPrimary} disabled={!notifPrefs.enabled} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabelSmall}>{copyProfile.notifWallet}</Text>
          <Switch value={notifPrefs.walletUpdates} onValueChange={(v) => handleNotifToggle('walletUpdates', v)} trackColor={{ false: colors.border, true: colors.walletBalance }} thumbColor={colors.textPrimary} disabled={!notifPrefs.enabled} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabelSmall}>{copyProfile.notifReminders}</Text>
          <Switch value={notifPrefs.reminders} onValueChange={(v) => handleNotifToggle('reminders', v)} trackColor={{ false: colors.border, true: colors.walletBalance }} thumbColor={colors.textPrimary} disabled={!notifPrefs.enabled} />
        </View>
        <View style={[styles.prefDivider, { backgroundColor: colors.border }]} />
        <Text style={styles.subSectionLabel}>{copyProfile.sectionLocation}</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{copyProfile.locationToggle}</Text>
          <Switch value={locationPrefs.enabled} onValueChange={handleLocationToggle} disabled={locationLoading} trackColor={{ false: colors.border, true: colors.walletBalance }} thumbColor={colors.textPrimary} />
        </View>
        <Text style={styles.hint}>{copyProfile.locationHint}</Text>
        {locationPrefs.enabled && (
          <>
            {(locationPrefs.city || locationPrefs.region) && (
              <Text style={styles.locationResult}>{copyProfile.locationEnabled} — {[locationPrefs.city, locationPrefs.region].filter(Boolean).join(', ') || 'Position enregistrée'}</Text>
            )}
            <TouchableOpacity
              style={[styles.linkBtn, { marginTop: spacing.sm }]}
              onPress={async () => {
                setLocationLoading(true);
                const geo = await getCurrentLocationOnce();
                const next: LocationPreferences = { enabled: true, city: geo.city, department: geo.department, region: geo.region };
                setLocationPrefs(next);
                await setLocationPreferences(next);
                setLocationLoading(false);
              }}
              disabled={locationLoading}
            >
              <Text style={[styles.linkBtnText, { color: colors.walletBalance }]}>{copyProfile.locationUpdate}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 5. Compte et support */}
      <Text style={styles.sectionLabel}>{copyProfile.sectionAccountSupport}</Text>
      <View style={[styles.lightBlock, { borderColor: colors.walletBorder }]}>
        <PressableScale style={styles.accountRow} onPress={() => { setSheetDisplayName(displayName ?? ''); setHeroSheetVisible(true); }}>
          <Text style={[styles.accountRowLabel, { color: colors.textPrimary }]}>{copyProfile.rowMonCompte}</Text>
          <Text style={[styles.accountRowChevron, { color: colors.textMuted }]}>›</Text>
        </PressableScale>
        <View style={[styles.accountDivider, { backgroundColor: colors.border }]} />
        <PressableScale style={styles.accountRow} onPress={() => Linking.openURL('mailto:support@pulsepanel.app').catch(() => {})}>
          <Text style={[styles.accountRowLabel, { color: colors.textPrimary }]}>{copyProfile.rowAideSupport}</Text>
          <Text style={[styles.accountRowChevron, { color: colors.textMuted }]}>›</Text>
        </PressableScale>
        <View style={[styles.accountDivider, { backgroundColor: colors.border }]} />
        <PressableScale
          style={styles.accountRow}
          onPress={() => {
            Alert.alert(copyProfile.rowDeconnexion, undefined, [
              { text: 'Annuler', style: 'cancel' },
              {
                text: copyProfile.rowDeconnexion,
                style: 'destructive',
                onPress: async () => {
                  await supabase.auth.signOut();
                  await ensureAnonSession();
                  getAppStore().resetForSignOut();
                  router.replace('/onboarding');
                },
              },
            ]);
          }}
        >
          <Text style={[styles.accountRowLabel, { color: colors.danger }]}>{copyProfile.rowDeconnexion}</Text>
        </PressableScale>
        <View style={[styles.accountDivider, { backgroundColor: colors.border }]} />
        <View style={styles.accountRow}>
          <Text style={[styles.accountRowLabel, { color: colors.textSecondary }]}>{copyProfile.rowDemanderSuppression}</Text>
        </View>
        <Text style={styles.accountHint}>{copyProfile.deleteAccountPlaceholder}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionLabelFirst: { marginTop: 0 },
  heroIdentity: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    marginBottom: spacing.lg,
  },
  heroIdentityPressed: { opacity: 0.92 },
  heroIdentityTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  avatarImage: { width: '100%', height: '100%', borderRadius: 36 },
  heroIdentityMain: { flex: 1, minWidth: 0 },
  heroDisplayName: { fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  heroEmail: { fontSize: 16, fontWeight: '500', color: colors.textPrimary, marginBottom: 4 },
  heroEmailVerified: { fontSize: 12, fontWeight: '600', marginTop: 2, marginBottom: spacing.sm },
  heroTrustRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  trustBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
  trustBadgeText: { fontSize: 12, fontWeight: '600' },
  heroScoreInline: { fontSize: 14, color: colors.textSecondary },
  lightBlock: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  ciblageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  ciblageValue: { fontWeight: '600' },
  ciblageDivider: { height: 1, marginVertical: spacing.xs },
  compactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  compactLabel: { fontSize: 13, color: colors.textMuted, flex: 1 },
  compactValue: { fontSize: 15, color: colors.textPrimary, flex: 2, textAlign: 'right' },
  interestsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  miniChip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  miniChipText: { fontSize: 12, color: colors.textPrimary },
  editBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  editBtnText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  chipSelected: { backgroundColor: colors.walletBalanceMuted },
  chipText: { fontSize: 13, color: colors.textSecondary },
  shortInput: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 },
  editActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  cancelBtnText: { fontSize: 14, color: colors.textSecondary },
  saveBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.walletBalance, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: colors.background },
  subSectionLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm, marginTop: spacing.sm },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  toggleLabel: { fontSize: 15, color: colors.textPrimary, flex: 1 },
  toggleLabelSmall: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  toggleRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notifStatusBadge: { fontSize: 12 },
  linkBtn: { marginTop: spacing.xs },
  linkBtnText: { fontSize: 13 },
  locationResult: { fontSize: 13, color: colors.walletBalance, marginTop: spacing.sm },
  prefDivider: { height: 1, marginVertical: spacing.md },
  heroSheetEmailRow: { marginBottom: spacing.sm },
  heroSheetEmailValue: { fontSize: 16, fontWeight: '500', marginTop: 2 },
  heroSheetEmailVerified: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  heroSheetPhotoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  photoActionBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  photoActionBtnText: { fontSize: 13 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  accountRowLabel: { fontSize: 15 },
  accountRowChevron: { fontSize: 18 },
  accountDivider: { height: 1 },
  accountHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs, paddingBottom: spacing.sm },
  performanceBlock: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  performanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  performanceLabel: { fontSize: 14, color: colors.textSecondary },
  performanceValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  performanceDivider: { height: 1, marginVertical: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  heroSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl + 24, maxHeight: '90%', height: '90%' },
  heroSheetScroll: { flexGrow: 1, flexShrink: 1 },
  heroSheetScrollContent: { paddingBottom: spacing.xxl + 24 },
  heroSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textMuted, alignSelf: 'center', marginBottom: spacing.lg },
  heroSheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.lg },
  heroSheetSectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  heroSheetLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  heroSheetInput: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 16 },
  heroSheetAvatarWrap: { borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.xs },
  heroSheetPhotoHint: { fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  badgeExplanationBlock: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  badgeExplanationTitle: { fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  badgeExplanationText: { fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  heroSheetActions: { marginTop: spacing.xl, gap: spacing.md },
  heroSheetSaveBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  heroSheetSaveBtnText: { fontSize: 16, fontWeight: '600', color: colors.background },
  heroSheetCloseBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  heroSheetCloseBtnText: { fontSize: 14 },
});
