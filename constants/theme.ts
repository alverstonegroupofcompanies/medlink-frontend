/**
 * Simplified Color Theme - Based on Insightlancer Design
 * Only 2 primary colors (Blue variations) + White and Black
 */

import { Platform } from 'react-native';

// Primary Colors - Blue Palette (2 colors only)
export const PrimaryColors = {
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
export const SecondaryColors = {
  blue: '#2563EB',           // Same as primary
  blueLight: '#3B82F6',      // Light variation
};

// Status Colors - Using only blue variations + white/black
export const StatusColors = {
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
export const NeutralColors = {
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

// Dark mode colors (for future dark mode support)
export const DarkColors = {
  background: '#1a1a1a',
  cardBackground: '#2d2d2d',
  textPrimary: '#ffffff',
  textSecondary: '#e0e0e0',
  textTertiary: '#b0b0b0',
  border: '#404040',
  divider: '#333333',
};

const tintColorLight = PrimaryColors.main;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: NeutralColors.textPrimary,
    background: NeutralColors.background,
    tint: tintColorLight,
    icon: NeutralColors.textSecondary,
    tabIconDefault: NeutralColors.textTertiary,
    tabIconSelected: PrimaryColors.dark,
    primary: PrimaryColors.main,
    secondary: SecondaryColors.blue,
    success: StatusColors.success,
    error: StatusColors.error,
    warning: StatusColors.warning,
    card: NeutralColors.cardBackground,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: PrimaryColors.light,
    secondary: SecondaryColors.blueLight,
    success: StatusColors.success,
    error: StatusColors.error,
    warning: StatusColors.warning,
    card: '#1f1f1f',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
