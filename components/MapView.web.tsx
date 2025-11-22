import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Navigation } from 'lucide-react-native';
import { PrimaryColors, NeutralColors } from '@/constants/theme';

interface MapViewComponentProps {
  initialLocation?: { latitude: number; longitude: number };
  onLocationSelect?: (location: { latitude: number; longitude: number }) => void;
  height?: number;
  showCurrentLocationButton?: boolean;
}

export function MapViewComponent({
  initialLocation,
  onLocationSelect,
  height = 300,
  showCurrentLocationButton = true,
}: MapViewComponentProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(
    initialLocation || null
  );
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setSelectedLocation(newLocation);
      onLocationSelect?.(newLocation);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fallback UI for web platform (react-native-maps not supported)
  return (
    <View style={[styles.container, styles.fallbackContainer, { height }]}>
      <MapPin size={48} color={PrimaryColors.main} />
      <Text style={styles.fallbackText}>Map View</Text>
      <Text style={styles.fallbackSubtext}>
        {selectedLocation
          ? `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`
          : 'Tap button to get location'}
      </Text>
      {showCurrentLocationButton && (
        <TouchableOpacity
          style={styles.fallbackButton}
          onPress={getCurrentLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Navigation size={20} color="#fff" />
              <Text style={styles.fallbackButtonText}>Get Current Location</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 12,
    backgroundColor: NeutralColors.cardBackground,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PrimaryColors.lightest,
    padding: 24,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.dark,
    marginTop: 12,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PrimaryColors.main,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  fallbackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

