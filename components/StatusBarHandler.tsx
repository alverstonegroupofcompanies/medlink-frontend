import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { StatusBarStyles } from '@/constants/hospital-design';

interface StatusBarHandlerProps {
  backgroundColor?: string;
  barStyle?: 'light-content' | 'dark-content' | 'auto';
  translucent?: boolean;
}

/**
 * Reusable StatusBar component that ensures text is always readable
 * Auto-detects background color and sets appropriate bar style
 */
export function StatusBarHandler({
  backgroundColor = '#FFFFFF',
  barStyle = 'auto',
  translucent = false,
}: StatusBarHandlerProps) {
  let finalBarStyle: 'light-content' | 'dark-content';
  let finalBackgroundColor: string;

  if (barStyle === 'auto') {
    const autoStyle = StatusBarStyles.auto(backgroundColor);
    finalBarStyle = autoStyle.barStyle;
    finalBackgroundColor = autoStyle.backgroundColor;
  } else {
    finalBarStyle = barStyle;
    finalBackgroundColor = backgroundColor;
  }

  return (
    <StatusBar
      barStyle={finalBarStyle}
      backgroundColor={finalBackgroundColor}
      translucent={translucent}
    />
  );
}
