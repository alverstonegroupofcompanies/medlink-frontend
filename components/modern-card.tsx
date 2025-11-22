import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ModernColors, Shadows, BorderRadius, Spacing } from '@/constants/modern-theme';

interface ModernCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ModernCard({ 
  children, 
  style, 
  variant = 'default',
  padding = 'md' 
}: ModernCardProps) {
  const paddingValue = padding === 'none' ? 0 : padding === 'sm' ? Spacing.sm : padding === 'md' ? Spacing.md : Spacing.lg;
  
  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        { padding: paddingValue },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ModernColors.background.primary,
    borderRadius: BorderRadius.lg,
  },
  elevated: {
    ...Shadows.md,
    backgroundColor: ModernColors.background.primary,
  },
  outlined: {
    borderWidth: 1,
    borderColor: ModernColors.border.light,
    backgroundColor: ModernColors.background.primary,
  },
});



