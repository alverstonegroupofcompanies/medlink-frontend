import { createTamagui } from '@tamagui/core'
import { config } from '@tamagui/config/v3'

// Custom theme tokens based on your existing colors
const appConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      // Doctor theme colors
      doctorPrimary: '#2563EB',
      doctorPrimaryLight: '#E6F4FE',
      doctorAccent: '#10B981',
      doctorSuccess: '#22C55E',
      doctorWarning: '#F59E0B',
      doctorError: '#EF4444',
      // Hospital theme colors
      hospitalPrimary: '#7C3AED',
      hospitalPrimaryLight: '#F3E8FF',
      // Neutral colors
      background: '#FFFFFF',
      backgroundSecondary: '#F9FAFB',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',
      border: '#E5E7EB',
      cardBackground: '#FFFFFF',
    },
    dark: {
      ...config.themes.dark,
      doctorPrimary: '#3B82F6',
      doctorPrimaryLight: '#1E3A8A',
      doctorAccent: '#34D399',
      doctorSuccess: '#4ADE80',
      doctorWarning: '#FBBF24',
      doctorError: '#F87171',
      hospitalPrimary: '#8B5CF6',
      hospitalPrimaryLight: '#4C1D95',
      background: '#111827',
      backgroundSecondary: '#1F2937',
      textPrimary: '#F9FAFB',
      textSecondary: '#D1D5DB',
      textTertiary: '#9CA3AF',
      border: '#374151',
      cardBackground: '#1F2937',
    },
  },
  tokens: {
    ...config.tokens,
    size: {
      ...config.tokens.size,
      tabBarHeight: 70,
      tabBarIcon: 24,
    },
  },
})

export default appConfig

export type Conf = typeof appConfig

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

