import React from 'react';
import { StyleProp, ViewStyle, Platform } from 'react-native';
import { Edge, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenSafeAreaProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  edges?: Edge[];
  excludeBottom?: boolean; // When true, excludes bottom edge (useful for tab screens)
};

export function ScreenSafeArea({
  children,
  style,
  backgroundColor = '#ffffff',
  edges,
  excludeBottom = false,
}: ScreenSafeAreaProps) {
  // If excludeBottom is true, remove 'bottom' from edges
  // Default edges if not provided
  const defaultEdges: Edge[] = ['top', 'right', 'bottom', 'left'];
  const finalEdges = edges 
    ? (excludeBottom ? edges.filter(e => e !== 'bottom') : edges)
    : (excludeBottom ? defaultEdges.filter(e => e !== 'bottom') : defaultEdges);

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor }, style]} edges={finalEdges}>
      {children}
    </SafeAreaView>
  );
}

// Helper hook to get safe bottom padding for ScrollView content
export function useSafeBottomPadding() {
  const insets = useSafeAreaInsets();
  
  // For tab screens, account for:
  // - Tab bar height (approximately 75-90px depending on platform)
  // - System navigation bar (insets.bottom)
  const tabBarHeight = Platform.OS === 'ios' ? 90 : 75;
  const totalBottomPadding = tabBarHeight + Math.max(insets.bottom - 12, 0);
  
  return totalBottomPadding;
}






