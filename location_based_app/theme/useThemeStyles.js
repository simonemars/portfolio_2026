import { StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

export function useThemeStyles() {
  const { theme } = useTheme();
  return {
    theme,
    styles: StyleSheet.create({
      screen: { flex: 1, backgroundColor: theme.colors.bg },
      surface: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderColor: theme.colors.border,
        borderWidth: 1
      },
      title: { color: theme.colors.text },
      text: { color: theme.colors.text },
      dim: { color: theme.colors.textDim },
      chip: { backgroundColor: theme.colors.chip, borderRadius: 10 },
    }),
  };
}



