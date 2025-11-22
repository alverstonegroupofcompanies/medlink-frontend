import { type ViewProps } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  elevation?: number;
  mode?: 'flat' | 'elevated';
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  elevation = 0,
  mode = 'flat',
  ...otherProps 
}: ThemedViewProps) {
  const theme = useTheme();
  const backgroundColor = lightColor || darkColor || theme.colors.background;

  return (
    <Surface 
      style={[{ backgroundColor }, style]} 
      elevation={elevation}
      mode={mode}
      {...otherProps} 
    />
  );
}
