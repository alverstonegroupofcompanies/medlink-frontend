/**
 * Doctor App Theme - Pastel Green with Mint Accents
 * Soft, calming pastel green palette optimized for doctor interface
 * High contrast colors for excellent readability
 */

import { Platform } from 'react-native';

// Doctor Primary Colors - Pastel Mint Green Palette
export const DoctorPrimaryColors = {
  main: '#A8E6CF',           // Soft mint green - main primary
  dark: '#7FC8A9',           // Medium mint for contrast
  darker: '#5FA88A',         // Dark mint for text/emphasis
  darkText: '#2D6B54',       // Dark green for high contrast text
  light: '#C7F4D5',          // Light mint tint
  lighter: '#E0F7ED',        // Very light mint
  lightest: '#F0FBF7',       // Almost white mint background
  background: '#F7FDFA',     // Lightest background
  
  // Gradient colors
  gradientStart: '#A8E6CF',
  gradientEnd: '#C7F4D5',
  gradientLight: ['#F0FBF7', '#F7FDFA'],
  
  // Accent colors
  accent: '#B8D8C4',         // Sage green accent
  accentDark: '#8FB89D',     // Darker sage
};

// Doctor Secondary Colors - Complementary Pastels
export const DoctorSecondaryColors = {
  softBlue: '#B8D4E3',       // Soft pastel blue
  softLavender: '#D4C4E8',   // Soft pastel lavender
  softPeach: '#F4C2A1',      // Soft pastel peach
  softCoral: '#F5A097',      // Soft pastel coral
};

// Doctor Status Colors - High Contrast for Readability
export const DoctorStatusColors = {
  success: '#22C55E',        // Bright green (high contrast)
  successDark: '#16A34A',    // Darker green
  successLight: '#4ADE80',   // Light green
  successBg: '#D1FAE5',      // Light green background
  
  error: '#EF4444',          // Bright red (high contrast)
  errorDark: '#DC2626',      // Darker red
  errorLight: '#F87171',     // Light red
  errorBg: '#FEE2E2',        // Light red background
  
  warning: '#F59E0B',        // Bright orange (high contrast)
  warningDark: '#D97706',    // Darker orange
  warningLight: '#FBBF24',   // Light orange
  warningBg: '#FEF3C7',      // Light orange background
  
  info: '#3B82F6',           // Bright blue (high contrast)
  infoDark: '#2563EB',       // Darker blue
  infoLight: '#60A5FA',      // Light blue
  infoBg: '#DBEAFE',         // Light blue background
};

// Doctor Neutral Colors - Optimized for Readability
export const DoctorNeutralColors = {
  background: '#F7FDFA',           // Very light mint-tinted white
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

// Doctor Theme Export
export const DoctorTheme = {
  primary: DoctorPrimaryColors,
  secondary: DoctorSecondaryColors,
  status: DoctorStatusColors,
  neutral: DoctorNeutralColors,
};

// Doctor Color Scheme
export const DoctorColors = {
  light: {
    text: DoctorNeutralColors.textPrimary,
    background: DoctorNeutralColors.background,
    tint: DoctorPrimaryColors.main,
    icon: DoctorNeutralColors.textSecondary,
    tabIconDefault: DoctorNeutralColors.textTertiary,
    tabIconSelected: DoctorPrimaryColors.darker,
    primary: DoctorPrimaryColors.main,
    secondary: DoctorSecondaryColors.softBlue,
    success: DoctorStatusColors.success,
    error: DoctorStatusColors.error,
    warning: DoctorStatusColors.warning,
    card: DoctorNeutralColors.cardBackground,
  },
};

export default DoctorTheme;
