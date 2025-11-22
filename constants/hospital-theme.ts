/**
 * Hospital App Theme - Simplified Blue Theme
 * Based on Insightlancer design - Only 2 primary colors + white/black
 */

import { Platform } from 'react-native';

// Primary Colors - Blue Palette (2 colors only)
export const HospitalPrimaryColors = {
  main: '#2563EB',           // Primary blue (from image)
  dark: '#1E40AF',           // Darker blue for headers/contrast
  darker: '#1E3A8A',         // Very dark blue for text emphasis
  light: '#3B82F6',          // Light blue tint
  lighter: '#60A5FA',        // Very light blue
  lightest: '#DBEAFE',       // Almost white blue background
  background: '#F8FAFC',     // Lightest background (white with slight tint)
  
  // Gradient colors
  gradientStart: '#2563EB',
  gradientEnd: '#3B82F6',
  gradientLight: ['#DBEAFE', '#F8FAFC'],
};

// Secondary Colors - Same blue family (just variations)
export const HospitalSecondaryColors = {
  blue: '#2563EB',           // Same as primary
  blueLight: '#3B82F6',      // Light variation
};

// Status Colors - Using only blue variations + white/black
export const HospitalStatusColors = {
  success: '#10B981',        // Green (minimal use for success states)
  successDark: '#059669',
  successLight: '#34D399',
  successBg: '#D1FAE5',
  
  error: '#EF4444',          // Red (minimal use for errors)
  errorDark: '#DC2626',
  errorLight: '#F87171',
  errorBg: '#FEE2E2',
  
  warning: '#F59E0B',        // Orange (minimal use for warnings)
  warningDark: '#D97706',
  warningLight: '#FBBF24',
  warningBg: '#FEF3C7',
  
  info: '#2563EB',           // Blue (primary color)
  infoDark: '#1E40AF',
  infoLight: '#3B82F6',
  infoBg: '#DBEAFE',
};

// Neutral Colors - White and Black only
export const HospitalNeutralColors = {
  background: '#FFFFFF',       // Pure white
  cardBackground: '#FFFFFF', // Pure white for cards
  textPrimary: '#000000',    // Pure black for primary text
  textSecondary: '#1F2937',  // Dark gray (almost black)
  textTertiary: '#4B5563',   // Medium gray
  textLight: '#6B7280',      // Light gray
  border: '#E5E7EB',         // Light border (white with slight gray)
  divider: '#E5E7EB',        // Divider color
  shadow: 'rgba(0, 0, 0, 0.1)',  // Black shadow
  overlay: 'rgba(0, 0, 0, 0.5)',  // Black overlay
  white: '#FFFFFF',          // Pure white
  black: '#000000',          // Pure black
};

// Hospital Theme Export
export const HospitalTheme = {
  primary: HospitalPrimaryColors,
  secondary: HospitalSecondaryColors,
  status: HospitalStatusColors,
  neutral: HospitalNeutralColors,
};

// Hospital Color Scheme
export const HospitalColors = {
  light: {
    text: HospitalNeutralColors.textPrimary,
    background: HospitalNeutralColors.background,
    tint: HospitalPrimaryColors.main,
    icon: HospitalNeutralColors.textSecondary,
    tabIconDefault: HospitalNeutralColors.textTertiary,
    tabIconSelected: HospitalPrimaryColors.dark,
    primary: HospitalPrimaryColors.main,
    secondary: HospitalSecondaryColors.blue,
    success: HospitalStatusColors.success,
    error: HospitalStatusColors.error,
    warning: HospitalStatusColors.warning,
    card: HospitalNeutralColors.cardBackground,
  },
};

export default HospitalTheme;
