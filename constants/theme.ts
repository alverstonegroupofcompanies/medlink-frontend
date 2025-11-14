/**
 * Color theme with primary color #33d4cc (cyan/turquoise)
 * Colors are defined for light and dark mode with good contrast
 */

import { Platform } from 'react-native';

// Premium color palette - Modern Medical App Style
export const PrimaryColors = {
  main: '#33d4cc',        // Primary cyan (#33d4cc)
  dark: '#1a9a92',         // Darker shade for contrast
  darker: '#0d6b66',       // Even darker for text
  light: '#5fe3db',       // Lighter shade
  lighter: '#a8f0eb',     // Light tint
  lightest: '#e6f8f7',    // Very light background tint
  background: '#f0fcfb',  // Lightest background
  // Premium gradients
  gradientStart: '#33d4cc',
  gradientEnd: '#5fe3db',
  gradientLight: ['#e6f8f7', '#f0fcfb'],
};

// Secondary colors - Premium variations
export const SecondaryColors = {
  accent: '#6366f1',      // Premium indigo
  accentDark: '#4f46e5',  // Darker indigo
  accentLight: '#818cf8', // Lighter indigo
  purple: '#8b5cf6',      // Premium purple
  purpleDark: '#7c3aed',  // Darker purple
  pink: '#ec4899',        // Premium pink
  orange: '#f97316',      // Premium orange
  teal: '#14b8a6',        // Premium teal
};

// Status colors - High contrast for readability
export const StatusColors = {
  success: '#27ae60',     // Green (high contrast)
  successDark: '#1e8449', // Darker green
  successLight: '#52c97f', // Light green
  error: '#e74c3c',       // Red (high contrast)
  errorDark: '#c0392b',   // Darker red
  errorLight: '#ec7063',   // Light red
  warning: '#f39c12',     // Orange (high contrast)
  warningDark: '#d68910', // Darker orange
  warningLight: '#f5b041', // Light orange
  info: '#3498db',        // Blue info
  infoDark: '#2980b9',    // Darker blue
  infoLight: '#5dade2',   // Light blue
};

// Neutral colors - Optimized for readability
export const NeutralColors = {
  background: '#f8fbfb',   // Very light cyan-tinted white
  cardBackground: '#ffffff', // Pure white for cards
  textPrimary: '#1a1a1a',   // Dark gray/black (high contrast)
  textSecondary: '#4a5568', // Medium gray (good readability)
  textTertiary: '#718096',  // Light gray (subtle text)
  textLight: '#a0aec0',    // Very light gray (disabled text)
  border: '#e2e8f0',        // Light border (subtle)
  divider: '#edf2f7',       // Divider color
  shadow: 'rgba(0, 0, 0, 0.1)', // Shadow color
  overlay: 'rgba(0, 0, 0, 0.5)', // Overlay for modals
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
    tabIconSelected: tintColorLight,
    primary: PrimaryColors.main,
    secondary: SecondaryColors.accent,
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
    secondary: SecondaryColors.accentLight,
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
