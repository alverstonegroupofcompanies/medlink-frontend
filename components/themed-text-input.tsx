import { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TextInput as PaperTextInput, useTheme } from 'react-native-paper';

export type ThemedTextInputProps = ComponentProps<typeof PaperTextInput> & {
  error?: boolean;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
};

export function ThemedTextInput({
  style,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  ...props
}: ThemedTextInputProps) {
  const theme = useTheme();

  const renderIcon = (iconName?: keyof typeof MaterialIcons.glyphMap, position: 'left' | 'right' = 'left') => {
    if (!iconName) return undefined;
    return (
      <PaperTextInput.Icon
        icon={({ size, color }) => (
          <MaterialIcons name={iconName} size={size} color={color} />
        )}
        onPress={position === 'right' ? onRightIconPress : undefined}
      />
    );
  };

  return (
    <PaperTextInput
      mode="outlined"
      outlineColor={error ? theme.colors.error : theme.colors.outline}
      activeOutlineColor={error ? theme.colors.error : theme.colors.primary}
      error={error}
      style={[styles.input, style]}
      left={renderIcon(leftIcon, 'left')}
      right={renderIcon(rightIcon, 'right')}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    marginVertical: 6,
    backgroundColor: 'transparent',
  },
});

