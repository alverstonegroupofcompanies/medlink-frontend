import { StyleSheet, type TextProps } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'headline' | 'bodyLarge' | 'bodyMedium' | 'bodySmall' | 'labelLarge' | 'labelMedium' | 'labelSmall';
  variant?: 'displayLarge' | 'displayMedium' | 'displaySmall' | 'headlineLarge' | 'headlineMedium' | 'headlineSmall' | 'titleLarge' | 'titleMedium' | 'titleSmall' | 'labelLarge' | 'labelMedium' | 'labelSmall' | 'bodyLarge' | 'bodyMedium' | 'bodySmall';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  variant,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  
  // Map old type prop to Paper variant
  const getVariant = (): ThemedTextProps['variant'] => {
    if (variant) return variant;
    
    switch (type) {
      case 'title':
        return 'headlineLarge';
      case 'subtitle':
        return 'headlineMedium';
      case 'defaultSemiBold':
        return 'bodyLarge';
      case 'link':
        return 'labelLarge';
      case 'headline':
        return 'headlineMedium';
      case 'bodyLarge':
        return 'bodyLarge';
      case 'bodyMedium':
        return 'bodyMedium';
      case 'bodySmall':
        return 'bodySmall';
      default:
        return 'bodyMedium';
    }
  };

  const textVariant = getVariant();
  const textColor = lightColor || darkColor || theme.colors.onSurface;

  return (
    <Text
      variant={textVariant}
      style={[
        type === 'link' && { textDecorationLine: 'underline' },
        { color: textColor },
        style,
      ]}
      {...rest}
    />
  );
}
