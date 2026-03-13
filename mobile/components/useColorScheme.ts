import { useColorScheme as useColorSchemeCore } from 'react-native';

/** Retourne 'light' | 'dark' pour usage sûr dans Colors[theme] et TextInput keyboardAppearance. Jamais null ni undefined. */
export function useColorScheme(): 'light' | 'dark' {
  const coreScheme = useColorSchemeCore();
  return coreScheme === 'dark' ? 'dark' : 'light';
}
