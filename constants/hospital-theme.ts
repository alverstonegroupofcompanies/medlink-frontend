/**
 * Hospital App Theme - Pastel Green with Sage/Olive Accents
 * Professional, trustworthy sage green palette for hospital interface
 * High contrast colors for excellent readability
 */

import { Platform } from 'react-native';

// Hospital Primary Colors - Pastel Sage Green Palette
export const HospitalPrimaryColors = {
  main: '#9FAF8C',           // Sage green - main primary
  dark: '#7A8B6A',           // Medium sage for contrast
  darker: '#5F6F50',         // Dark sage for text/emphasis
  darkText: '#3D4A32',       // Very dark green for high contrast text
  light: '#B5C4A3',          // Light sage tint
  lighter: '#D1DDC7',        // Very light sage
  lightest: '#E8EDE4',       // Almost white sage background
  background: '#F4F6F2',     // Lightest background
  
  // Gradient colors
  gradientStart: '#9FAF8C',
  gradientEnd: '#B5C4A3',
  gradientLight: ['#E8EDE4', '#F4F6F2'],
  
  // Accent colors
  accent: '#B5B887',         // Olive green accent
  accentDark: '#8F9568',     // Darker olive
};

// Hospital Secondary Colors - Complementary Pastels
export const HospitalSecondaryColors = {
  softTeal: '#A3C4BC',       // Soft pastel teal
  softMauve: '#C4B3A3',      // Soft pastel mauve
  softAmber: '#D4C299',      // Soft pastel amber
  softSlate: '#B3B8C4',      // Soft pastel slate
};

// Hospital Status Colors - High Contrast for Readability
export const HospitalStatusColors = {
  success: '#10B981',        // Bright emerald (high contrast)
  successDark: '#059669',    // Darker emerald
  successLight: '#34D399',   // Light emerald
  successBg: '#D1FAE5',      // Light emerald background
  
  error: '#F43F5E',          // Bright rose red (high contrast)
  errorDark: '#E11D48',      // Darker rose
  errorLight: '#FB7185',     // Light rose
  errorBg: '#FEE2E2',        // Light rose background
  
  warning: '#F97316',        // Bright orange (high contrast)
  warningDark: '#EA580C',    // Darker orange
  warningLight: '#FB923C',   // Light orange
  warningBg: '#FFEDD5',      // Light orange background
  
  info: '#0EA5E9',           // Bright sky blue (high contrast)
  infoDark: '#0284C7',       // Darker sky blue
  infoLight: '#38BDF8',      // Light sky blue
  infoBg: '#E0F2FE',         // Light sky blue background
};

// Hospital Neutral Colors - Optimized for Readability
export const HospitalNeutralColors = {
  background: '#F4F6F2',           // Very light sage-tinted white
  cardBackground: '#FFFFFF',       // Pure white for cards
  textPrimary: '#1F2937',          // Very dark gray (high contrast)
  textSecondary: '#4B5563',        // Dark gray (excellent readability)
  textTertiary: '#6B7280',         // Medium gray (good readability)
  textLight: '#9CA3AF',            // Light gray (subtle text)
  border: '#D1D5DB',               // Light border
  divider: '#E5E7EB',             // Divider color
  shadow: 'rgba(0, 0, 0, 0.08)',  // Soft shadow
  overlay: 'rgba(0, 0, 0, 0.5)',  // Overlay for modals
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
    tabIconSelected: HospitalPrimaryColors.darker,
    primary: HospitalPrimaryColors.main,
    secondary: HospitalSecondaryColors.softTeal,
    success: HospitalStatusColors.success,
    error: HospitalStatusColors.error,
    warning: HospitalStatusColors.warning,
    card: HospitalNeutralColors.cardBackground,
  },
};

export default HospitalTheme;
