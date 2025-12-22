import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { Platform } from 'react-native';

const fontConfig = {
  displayLarge: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 56,
    fontSize: 57,
  },
  displayMedium: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 52,
    fontSize: 45,
  },
  displaySmall: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 44,
    fontSize: 36,
  },
  headlineLarge: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 40,
    fontSize: 32,
  },
  headlineMedium: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 36,
    fontSize: 28,
  },
  headlineSmall: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 32,
    fontSize: 24,
  },
  titleLarge: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 0.5,
    lineHeight: 28,
    fontSize: 22,
  },
  titleMedium: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 0.5,
    lineHeight: 24,
    fontSize: 16,
  },
  titleSmall: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 0.5,
    lineHeight: 20,
    fontSize: 14,
  },
  labelLarge: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 20,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  labelMedium: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 16,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 16,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  bodyLarge: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: '400',
    letterSpacing: 0.5,
    lineHeight: 24,
    fontSize: 16,
  },
  bodyMedium: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: '400',
    letterSpacing: 0.5,
    lineHeight: 20,
    fontSize: 14,
  },
  bodySmall: {
    fontFamily: Platform.select({ web: 'Inter, sans-serif', default: 'System' }),
    fontWeight: '400',
    letterSpacing: 0.5,
    lineHeight: 16,
    fontSize: 12,
  },
} as const;

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1E2E23', // Accent / Letter Card
    onPrimary: '#FFFFFF',
    primaryContainer: '#16261C', // Sidebar Background
    onPrimaryContainer: '#FFFFFF',
    secondary: '#16261C',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#1E2E23',
    onSecondaryContainer: '#FFFFFF',
    tertiary: '#FFFFFF',
    onTertiary: '#0F1A13',
    tertiaryContainer: '#FFFFFF',
    onTertiaryContainer: '#0F1A13',
    background: '#0F1A13', // Primary Background
    onBackground: '#FFFFFF',
    surface: '#1E2E23', // Accent / Letter Card
    onSurface: '#FFFFFF',
    surfaceVariant: '#16261C',
    onSurfaceVariant: '#FFFFFF',
    outline: 'rgba(255, 255, 255, 0.1)',
    outlineVariant: 'rgba(255, 255, 255, 0.05)',
    error: '#CF6679',
    onError: '#000000',
    backdrop: 'rgba(15, 26, 19, 0.5)',
    placeholder: 'rgba(255, 255, 255, 0.4)', // Secondary/Muted Text
  },
  fonts: configureFonts({config: fontConfig}),
  roundness: 12,
};

export const customColors = {
  background: '#0F1A13',
  sidebar: '#16261C',
  card: '#1E2E23',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
  glow: 'rgba(255, 255, 255, 0.05)',
};

export const shadows = {
  floating: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.5,
    shadowRadius: 50, 
    elevation: 20,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
};
