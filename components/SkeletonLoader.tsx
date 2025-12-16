import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { VibrantColors, VibrantShadows } from '@/constants/vibrant-theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  rounded?: number;
}

const Shimmer: React.FC<SkeletonProps> = ({ width = '100%', height = 12, style, rounded = 12 }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  return (
    <View style={[styles.placeholder, { width, height, borderRadius: rounded }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

interface SkeletonCardProps {
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3 }) => {
  return (
    <View style={styles.card}>
      <Shimmer width="40%" height={14} rounded={10} />
      <Shimmer width="60%" height={12} rounded={10} style={styles.line} />
      {Array.from({ length: lines }).map((_, index) => (
        <Shimmer
          key={`skeleton-line-${index}`}
          width={`${80 - index * 10}%`}
          height={10}
          rounded={8}
          style={styles.line}
        />
      ))}
    </View>
  );
};

export const SkeletonLoader = {
  Line: Shimmer,
  Card: SkeletonCard,
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: VibrantColors.primary.lightest,
    overflow: 'hidden',
  },
  shimmer: {
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    opacity: 0.7,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
    ...VibrantShadows.soft,
  },
  line: {
    marginTop: 10,
  },
});
















