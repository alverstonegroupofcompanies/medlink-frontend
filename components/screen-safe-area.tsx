import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

type ScreenSafeAreaProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  edges?: Edge[];
};

export function ScreenSafeArea({
  children,
  style,
  backgroundColor = '#ffffff',
  edges = ['top', 'right', 'bottom', 'left'],
}: ScreenSafeAreaProps) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}






