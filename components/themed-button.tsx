import { TouchableOpacity, type TouchableOpacityProps, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from './themed-text';
import { PrimaryColors } from '@/constants/theme';

export type ThemedButtonProps = TouchableOpacityProps & {
  title?: string;
  text?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
};

export function ThemedButton({
  title,
  text,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  onPress,
  ...props
}: ThemedButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const buttonText = title || text || '';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary && { backgroundColor: PrimaryColors.main },
        isSecondary && styles.secondaryButton,
        isOutline && {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: PrimaryColors.main,
        },
        (disabled || loading) && styles.disabledButton,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      onPress={onPress}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          color={isOutline ? PrimaryColors.main : '#ffffff'} 
          size="small" 
        />
      ) : (
        <ThemedText
          style={[
            styles.buttonText,
            isPrimary && styles.primaryButtonText,
            isSecondary && styles.secondaryButtonText,
            isOutline && { color: PrimaryColors.main },
          ]}
        >
          {buttonText}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    padding: 14,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#6b7280',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#ffffff',
  },
});
