import { TextInput, type TextInputProps, StyleSheet, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type ThemedTextInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
  error?: boolean;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
};

export function ThemedTextInput({
  style,
  lightColor,
  darkColor,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  ...props
}: ThemedTextInputProps) {
  const colorScheme = useColorScheme();
  const textColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = error 
    ? '#ef4444' 
    : colorScheme === 'dark' 
      ? '#374151' 
      : '#e5e7eb';
  const iconColor = colorScheme === 'dark' ? '#9BA1A6' : '#6b7280';

  return (
    <View style={[styles.container, { borderColor }]}>
      {leftIcon && (
        <MaterialIcons 
          name={leftIcon} 
          size={20} 
          color={iconColor} 
          style={styles.leftIcon} 
        />
      )}
      <TextInput
        style={[
          styles.input,
          {
            color: textColor,
            backgroundColor: 'transparent',
            paddingLeft: leftIcon ? 40 : 12,
            paddingRight: rightIcon ? 40 : 12,
          },
          style,
        ]}
        placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#9ca3af'}
        {...props}
      />
      {rightIcon && (
        <MaterialIcons 
          name={rightIcon} 
          size={20} 
          color={iconColor} 
          style={styles.rightIcon}
          onPress={onRightIconPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  leftIcon: {
    marginLeft: 12,
  },
  rightIcon: {
    marginRight: 12,
  },
});

