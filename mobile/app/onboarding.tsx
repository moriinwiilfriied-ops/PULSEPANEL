/**
 * Onboarding — âge (18+), région, tags (chips)
 * Stocké dans le store Zustand. "Commencer" → feed.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { isSupabaseConfigured, upsertUserOnboarding } from '@/lib/supabaseApi';

const TAGS = ['Tech', 'Mode', 'Alimentation', 'Sport', 'Voyage', 'Culture', 'Santé', 'Finance'];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { age, region, tags, setOnboarding, completeOnboarding } = useAppStore();
  const [ageVal, setAgeVal] = useState(age?.toString() ?? '');
  const [regionVal, setRegionVal] = useState(region ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);

  const textColor = colors.text;
  const placeholderColor = colors.tabIconDefault;
  const inputBg = colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const borderColor = colors.tabIconDefault;
  const selectionColor = colors.tint;
  const keyboardAppearance: 'light' | 'dark' | 'default' | undefined = colorScheme;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleStart = async () => {
    const a = parseInt(ageVal, 10);
    if (Number.isNaN(a) || a < 18) return;
    setOnboarding(a, regionVal || null, selectedTags);
    completeOnboarding();
    const ageBucket = a < 25 ? '18-24' : a < 35 ? '25-34' : a < 45 ? '35-44' : '45+';
    if (isSupabaseConfigured()) {
      await upsertUserOnboarding({ ageBucket, region: regionVal || null, tags: selectedTags });
    }
    router.replace('/(tabs)/feed');
  };

  const ageOk = (() => {
    const a = parseInt(ageVal, 10);
    return !Number.isNaN(a) && a >= 18;
  })();

  const inputStyle = [
    styles.input,
    {
      color: textColor,
      backgroundColor: inputBg,
      borderColor,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 24, backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: textColor }]}>Bienvenue sur PulsePanel</Text>
      <Text style={[styles.subtitle, { color: textColor }]}>Quelques infos pour personnaliser votre feed.</Text>

      <Text style={[styles.label, { color: textColor }]}>Âge (18+)</Text>
      <TextInput
        style={inputStyle}
        value={ageVal}
        onChangeText={setAgeVal}
        placeholder="Ex: 25"
        placeholderTextColor={placeholderColor}
        selectionColor={selectionColor}
        keyboardType="number-pad"
        keyboardAppearance={keyboardAppearance}
      />

      <Text style={[styles.label, { color: textColor }]}>Région</Text>
      <TextInput
        style={inputStyle}
        value={regionVal}
        onChangeText={setRegionVal}
        placeholder="Ex: Île-de-France"
        placeholderTextColor={placeholderColor}
        selectionColor={selectionColor}
        autoCapitalize="none"
        keyboardAppearance={keyboardAppearance}
      />

      <Text style={[styles.label, { color: textColor }]}>{'Centres d\'intérêt (optionnel)'}</Text>
      <View style={styles.chips}>
        {TAGS.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.chip, { borderColor }, selectedTags.includes(tag) && styles.chipSelected]}
            onPress={() => toggleTag(tag)}
          >
            <Text style={[styles.chipText, { color: textColor }, selectedTags.includes(tag) && styles.chipTextSelected]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, !ageOk && styles.buttonDisabled]}
        onPress={handleStart}
        disabled={!ageOk}
      >
        <Text style={styles.buttonText}>Commencer</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, opacity: 0.7, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, opacity: 0.9 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipSelected: { backgroundColor: '#171717', borderColor: '#171717' },
  chipText: { fontSize: 14 },
  chipTextSelected: { color: '#fff' },
  button: {
    backgroundColor: '#171717',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
