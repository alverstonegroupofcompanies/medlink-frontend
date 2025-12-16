import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { VibrantColors, VibrantShadows } from '@/constants/vibrant-theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormField: React.FC<Props> = ({ label, error, helperText, style, ...rest }) => {
  const isError = Boolean(error);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, isError && styles.inputError]}>
        <TextInput
          placeholderTextColor={VibrantColors.neutral.gray400}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
      {helperText && !isError && <Text style={styles.helper}>{helperText}</Text>}
      {isError && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: VibrantColors.neutral.gray700,
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 16,
    backgroundColor: VibrantColors.neutral.gray100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...VibrantShadows.soft,
  },
  input: {
    fontSize: 15,
    color: VibrantColors.neutral.gray900,
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
    color: VibrantColors.neutral.gray500,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: VibrantColors.error.main,
  },
  inputError: {
    borderWidth: 1,
    borderColor: VibrantColors.error.main,
  },
});
















