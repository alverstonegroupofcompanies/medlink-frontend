/**
 * Modern Design System - MedLink
 * Professional healthcare app with modern UI/UX
 */

export const ModernColors = {
  // Primary Colors - Modern Blue
  primary: {
    main: '#0066FF',        // Vibrant blue
    light: '#E6F2FF',       // Light blue background
    dark: '#0052CC',        // Dark blue
    gradient: ['#0066FF', '#0052CC'], // Gradient
  },
  
  // Secondary Colors - Modern Purple
  secondary: {
    main: '#7B61FF',        // Purple accent
    light: '#F0EDFF',       // Light purple background
    dark: '#5B3FD9',        // Dark purple
    gradient: ['#7B61FF', '#5B3FD9'], // Gradient
  },
  
  // Success - Modern Green
  success: {
    main: '#10B981',        // Success green
    light: '#D1FAE5',       // Light green
    dark: '#059669',        // Dark green
  },
  
  // Warning - Modern Amber
  warning: {
    main: '#F59E0B',        // Warning amber
    light: '#FEF3C7',       // Light amber
    dark: '#D97706',       // Dark amber
  },
  
  // Error - Modern Red
  error: {
    main: '#EF4444',        // Error red
    light: '#FEE2E2',       // Light red
    dark: '#DC2626',       // Dark red
  },
  
  // Neutral Colors - Modern Grays
  neutral: {
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    black: '#000000',
  },
  
  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    dark: '#111827',
  },
  
  // Text Colors
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
    disabled: '#D1D5DB',
  },
  
  // Border Colors
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },
  
  // Shadow Colors
  shadow: {
    sm: 'rgba(0, 0, 0, 0.05)',
    md: 'rgba(0, 0, 0, 0.1)',
    lg: 'rgba(0, 0, 0, 0.15)',
    xl: 'rgba(0, 0, 0, 0.2)',
  },
}

// Doctor-specific theme
export const DoctorTheme = {
  primary: ModernColors.primary,
  accent: ModernColors.secondary,
  background: ModernColors.background.primary,
  card: ModernColors.background.primary,
  text: ModernColors.text,
}

// Hospital-specific theme
export const HospitalTheme = {
  primary: ModernColors.secondary,
  accent: ModernColors.primary,
  background: ModernColors.background.primary,
  card: ModernColors.background.primary,
  text: ModernColors.text,
}

// Spacing System
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

// Border Radius
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
}

// Typography
export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
}

// Shadows
export const Shadows = {
  sm: {
    shadowColor: ModernColors.shadow.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: ModernColors.shadow.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: ModernColors.shadow.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: ModernColors.shadow.xl,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
}



