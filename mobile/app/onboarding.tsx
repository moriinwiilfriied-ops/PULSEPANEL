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

const REGIONS = ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes', 'Occitanie', 'Autre'];
const TAGS = ['Tech', 'Mode', 'Alimentation', 'Sport', 'Voyage', 'Culture', 'Santé', 'Finance'];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { age, region, tags, setOnboarding, completeOnboarding } = useAppStore();
  const [ageVal, setAgeVal] = useState(age?.toString() ?? '');
  const [regionVal, setRegionVal] = useState(region ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleStart = () => {
    const a = parseInt(ageVal, 10);
    if (Number.isNaN(a) || a < 18) return;
    setOnboarding(a, regionVal || null, selectedTags);
    completeOnboarding();
    router.replace('/(tabs)/feed');
  };

  const ageOk = (() => {
    const a = parseInt(ageVal, 10);
    return !Number.isNaN(a) && a >= 18;
  })();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 24 }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Bienvenue sur PulsePanel</Text>
      <Text style={styles.subtitle}>Quelques infos pour personnaliser votre feed.</Text>

      <Text style={styles.label}>Âge (18+)</Text>
      <TextInput
        style={styles.input}
        value={ageVal}
        onChangeText={setAgeVal}
        placeholder="Ex: 25"
        keyboardType="number-pad"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Région</Text>
      <TextInput
        style={styles.input}
        value={regionVal}
        onChangeText={setRegionVal}
        placeholder="Ex: Île-de-France"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Centres d'intérêt (optionnel)</Text>
      <View style={styles.chips}>
        {TAGS.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.chip, selectedTags.includes(tag) && styles.chipSelected]}
            onPress={() => toggleTag(tag)}
          >
            <Text style={[styles.chipText, selectedTags.includes(tag) && styles.chipTextSelected]}>
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
    borderColor: '#ddd',
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
    borderColor: '#ddd',
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
