import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { VibrantColors } from '@/constants/vibrant-theme';

interface Props {
  uri?: string | null;
  width: number;
  height: number;
  borderRadius?: number;
  fallback?: React.ReactNode;
}

export const LazyImage: React.FC<Props> = ({ uri, width, height, borderRadius = 16, fallback }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!uri || error) {
    return (
      <View style={[styles.placeholder, { width, height, borderRadius }]}>
        {fallback}
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      {!loaded && (
        <View style={[styles.loader, { borderRadius }]}>
          <ActivityIndicator color={VibrantColors.primary.main} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={{ width, height, borderRadius }}
        contentFit="cover"
        cachePolicy="memory-disk"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: VibrantColors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: VibrantColors.neutral.gray100,
  },
});
















