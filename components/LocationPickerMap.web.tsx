import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import * as Location from 'expo-location';

interface LocationPickerMapProps {
  initialLatitude?: number | string;
  initialLongitude?: number | string;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: number;
}

export function LocationPickerMap({ 
  initialLatitude, 
  initialLongitude, 
  onLocationSelect, 
  height = 300 
}: LocationPickerMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(() => {
    const lat = typeof initialLatitude === 'number' ? initialLatitude : parseFloat(initialLatitude as string);
    const lng = typeof initialLongitude === 'number' ? initialLongitude : parseFloat(initialLongitude as string);
    
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { latitude: lat, longitude: lng };
    }
    return null;
  });
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
      onLocationSelect(newLocation.latitude, newLocation.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation.latitude, selectedLocation.longitude);
    }
  };

  // Fallback UI for web platform (react-native-maps not supported)
  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.fallbackContainer}>
        <MapPin size={48} color={PrimaryColors.main} />
        <Text style={styles.fallbackText}>Location Picker</Text>
        <Text style={styles.fallbackSubtext}>
          {selectedLocation
            ? `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`
            : 'Tap button to get your current location'}
        </Text>
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
        {selectedLocation && (
          <TouchableOpacity
            style={[styles.fallbackButton, styles.confirmButton]}
            onPress={handleLocationSelect}
          >
            <Text style={styles.fallbackButtonText}>Use This Location</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PrimaryColors.lightest || '#f0f4f8',
    padding: 24,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.dark || '#1a1a1a',
    marginTop: 12,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 16,
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PrimaryColors.main,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: PrimaryColors.dark || '#1a1a1a',
    marginTop: 12,
  },
  fallbackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
