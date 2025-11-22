import { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

type PaperButtonProps = ComponentProps<typeof Button>;

export type ThemedButtonProps = PaperButtonProps & {
  title?: string;
  text?: string;
  variant?: 'primary' | 'secondary' | 'outline';
};

export function ThemedButton({
  title,
  text,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  onPress,
  uppercase = false,
  ...rest
}: ThemedButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const buttonText = title || text || '';
  const mode = isOutline ? 'outlined' : isSecondary ? 'contained-tonal' : 'contained';
  const buttonColor = isPrimary
    ? theme.colors.primary
    : isSecondary
      ? theme.colors.secondary
      : undefined;
  const textColor = isOutline
    ? theme.colors.primary
    : isSecondary
      ? theme.colors.onSecondary
      : theme.colors.onPrimary;

  return (
    <Button
      mode={mode}
      style={[styles.button, style]}
      contentStyle={styles.content}
      buttonColor={buttonColor}
      textColor={textColor}
      loading={loading}
      disabled={disabled || loading}
      onPress={onPress}
      uppercase={uppercase}
      rippleColor="rgba(255,255,255,0.12)"
      {...rest}
    >
      {buttonText}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
  },
  content: {
    fontSize: 16,
    minHeight: 52,
    paddingVertical: 6,
  },
});
