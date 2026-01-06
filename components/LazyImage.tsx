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

import { API_BASE_URL } from '@/config/api';

export const LazyImage: React.FC<Props> = ({ uri, width, height, borderRadius = 16, fallback }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const getFullUri = (path?: string | null) => {
    console.log('🖼️ [LazyImage] getFullUri input:', path);
    
    if (!path) {
      console.log('🖼️ [LazyImage] No path provided');
      return null;
    }
    
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
      console.log('🖼️ [LazyImage] Already full URL:', path);
      return path;
    }
    
    // Handle relative paths (e.g. /app/...)
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
    const fullUrl = `${baseUrl}${cleanPath}`;
    
    console.log('🖼️ [LazyImage] Constructed URL:', fullUrl);
    return fullUrl;
  };

  const fullUri = getFullUri(uri);

  if (!fullUri || error) {
    console.log('🖼️ [LazyImage] Showing fallback - fullUri:', fullUri, 'error:', error);
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
        source={{ uri: fullUri }}
        style={{ width, height, borderRadius }}
        contentFit="cover"
        cachePolicy="memory-disk"
        onLoad={() => {
          console.log('🖼️ [LazyImage] ✅ Image loaded successfully:', fullUri);
          setLoaded(true);
        }}
        onError={(error) => {
          console.error('🖼️ [LazyImage] ❌ Image load failed:', fullUri);
          console.error('🖼️ [LazyImage] Error details:', error);
          setError(true);
        }}
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

















