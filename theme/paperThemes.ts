import { MD3LightTheme, configureFonts, type MD3Theme } from 'react-native-paper';
import { Platform } from 'react-native';

// Helper to get font family with fallback
const getFontFamily = (fontName: string) => {
  if (Platform.OS === 'web') {
    // On web, use system fonts as fallback
    return `${fontName}, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  }
  return fontName;
};

const fontConfig = {
  displayLarge: {
    fontFamily: getFontFamily('Jost_700Bold'),
    fontSize: 48,
    fontWeight: '700' as const,
    letterSpacing: 0,
    lineHeight: 56,
  },
  displayMedium: {
    fontFamily: getFontFamily('Jost_600SemiBold'),
    fontSize: 42,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 48,
  },
  displaySmall: {
    fontFamily: getFontFamily('Jost_600SemiBold'),
    fontSize: 36,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 42,
  },
  headlineLarge: {
    fontFamily: getFontFamily('Jost_600SemiBold'),
    fontSize: 32,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 38,
  },
  headlineMedium: {
    fontFamily: getFontFamily('Jost_600SemiBold'),
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 34,
  },
  headlineSmall: {
    fontFamily: getFontFamily('Jost_600SemiBold'),
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 30,
  },
  titleLarge: {
    fontFamily: getFontFamily('Jost_600SemiBold'),
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: getFontFamily('Jost_500Medium'),
    fontSize: 18,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: getFontFamily('Jost_500Medium'),
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 22,
  },
  labelLarge: {
    fontFamily: getFontFamily('Jost_500Medium'),
    fontSize: 15,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: getFontFamily('Roboto_500Medium'),
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  labelSmall: {
    fontFamily: getFontFamily('Roboto_500Medium'),
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  bodyLarge: {
    fontFamily: getFontFamily('Roboto_400Regular'),
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: getFontFamily('Roboto_400Regular'),
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: getFontFamily('Roboto_400Regular'),
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 18,
  },
};

const baseFonts = configureFonts({
  config: fontConfig,
});

const buildTheme = (overrides: Partial<MD3Theme['colors']>): MD3Theme => ({
  ...MD3LightTheme,
  roundness: 18,
  colors: {
    ...MD3LightTheme.colors,
    ...overrides,
  },
  fonts: baseFonts,
});

export const doctorPaperTheme = buildTheme({
  primary: '#1D2671',
  secondary: '#3F8EFC',
  tertiary: '#F5A524',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#EEF2FF',
  outline: '#D0D7EA',
  error: '#F4727F',
  onPrimary: '#FFFFFF',
  onSurface: '#1F2937',
});

export const hospitalPaperTheme = buildTheme({
  primary: '#1B7F79',
  secondary: '#58B09C',
  tertiary: '#F5A524',
  background: '#F6FBF9',
  surface: '#FFFFFF',
  surfaceVariant: '#E2F2ED',
  outline: '#C9E2DA',
  error: '#F4727F',
  onPrimary: '#FFFFFF',
  onSurface: '#1E2B26',
});






