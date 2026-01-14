/**
 * Material Design 3 Design System for Hospital App
 * Provides consistent colors, elevation, spacing, typography, and shadows
 */

// Color Palette - Material Design 3
export const HospitalDesignColors = {
  // Primary Colors
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  
  // Surface Colors
  surface: '#FFFFFF',
  surfaceVariant: '#F8FAFC',
  background: '#F1F5F9',
  
  // Text Colors
  onSurface: '#1E293B',
  onSurfaceVariant: '#64748B',
  onPrimary: '#FFFFFF',
  
  // Semantic Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#3B82F6',
  
  // Neutral Colors
  neutral50: '#F8FAFC',
  neutral100: '#F1F5F9',
  neutral200: '#E2E8F0',
  neutral300: '#CBD5E1',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',
  
  // Border Colors
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
};

// Elevation Levels (Material Design 3)
export const Elevation = {
  level0: {
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  level1: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  level2: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  level3: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  level4: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  level5: {
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  level6: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  level7: {
    elevation: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  level8: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
};

// Spacing System (8dp grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999, // Fully rounded
};

// Typography Scale
export const Typography = {
  display: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  overline: {
    fontSize: 10,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
};

// Card Styles
export const CardStyles = {
  default: {
    backgroundColor: HospitalDesignColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Elevation.level2,
  },
  elevated: {
    backgroundColor: HospitalDesignColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Elevation.level3,
  },
  outlined: {
    backgroundColor: HospitalDesignColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: HospitalDesignColors.border,
  },
};

// Button Styles
export const ButtonStyles = {
  contained: {
    backgroundColor: HospitalDesignColors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Elevation.level2,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: HospitalDesignColors.primary,
  },
  text: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
};

// Input Styles
export const InputStyles = {
  default: {
    backgroundColor: HospitalDesignColors.surfaceVariant,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: HospitalDesignColors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body1.fontSize,
    color: HospitalDesignColors.onSurface,
  },
  focused: {
    backgroundColor: HospitalDesignColors.surface,
    borderColor: HospitalDesignColors.primary,
    ...Elevation.level1,
  },
  error: {
    borderColor: HospitalDesignColors.error,
  },
};

// Header Styles
export const HeaderStyles = {
  height: 120,
  paddingHorizontal: Spacing.md,
  paddingTop: Spacing.md,
  paddingBottom: Spacing.lg,
};

// Status Bar Styles
export const StatusBarStyles = {
  light: {
    barStyle: 'light-content' as const,
    backgroundColor: HospitalDesignColors.primary,
  },
  dark: {
    barStyle: 'dark-content' as const,
    backgroundColor: HospitalDesignColors.surface,
  },
  auto: (backgroundColor: string) => {
    // Determine if background is dark or light
    const isDark = backgroundColor === HospitalDesignColors.primary || 
                   backgroundColor === HospitalDesignColors.primaryDark ||
                   backgroundColor === HospitalDesignColors.neutral800 ||
                   backgroundColor === HospitalDesignColors.neutral900;
    
    return {
      barStyle: (isDark ? 'light-content' : 'dark-content') as 'light-content' | 'dark-content',
      backgroundColor,
    };
  },
};
