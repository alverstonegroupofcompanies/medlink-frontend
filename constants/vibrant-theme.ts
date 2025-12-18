/**
 * Vibrant Theme System
 * Bold, colorful palette + helpers for reusable UI tokens
 */

export const VibrantColors = {
  primary: {
    main: '#2563EB',
    light: '#3B82F6',
    lighter: '#93C5FD',
    lightest: '#E0ECFF',
    dark: '#1D4ED8',
    darker: '#1E3A8A',
  },
  secondary: {
    main: '#F97316',
    light: '#FDBA74',
    lighter: '#FFE4D6',
    dark: '#EA580C',
    darker: '#C2410C',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    lighter: '#D1FAE5',
    dark: '#059669',
    darker: '#047857',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    lighter: '#FEF3C7',
    dark: '#D97706',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    lighter: '#FECACA',
    dark: '#B91C1C',
  },
  info: {
    main: '#0EA5E9',
    light: '#38BDF8',
    lighter: '#E0F2FE',
  },
  neutral: {
    black: '#0F172A',
    gray900: '#0F172A',
    gray800: '#1E293B',
    gray700: '#334155',
    gray600: '#475569',
    gray500: '#94A3B8',
    gray400: '#CBD5F5',
    gray300: '#E2E8F0',
    gray200: '#F1F5F9',
    gray100: '#F8FAFC',
    white: '#FFFFFF',
  },
};

export const VibrantGradients = {
  primary: ['#2563EB', '#7C3AED'],
  sunset: ['#F97316', '#F43F5E'],
  ocean: ['#0EA5E9', '#38BDF8'],
  aurora: ['#34D399', '#3B82F6'],
};

export const VibrantShadows = {
  soft: {
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
  heavy: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 18,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 18,
  }),
};

export const VibrantRadius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const VibrantTypography = {
  display: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySecondary: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
};

export const VibrantSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 40,
};

















