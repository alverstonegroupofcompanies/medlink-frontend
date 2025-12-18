import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Platform } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Navigation } from 'lucide-react-native';
import { PrimaryColors, NeutralColors, StatusColors } from '@/constants/theme';
import MapView from 'react-native-maps';
import { Marker } from 'react-native-maps';

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
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 28.6139,
    longitude: initialLocation?.longitude || 77.2090,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0921,
  });
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(
    initialLocation || null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialLocation) {
      setRegion({
        ...region,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation]);

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newLocation = { latitude, longitude };
    setSelectedLocation(newLocation);
    setRegion({
      ...region,
      latitude,
      longitude,
    });
    onLocationSelect?.(newLocation);
  };

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
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      onLocationSelect?.(newLocation);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        region={region}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
        mapType="standard"
      >
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Selected Location"
            description="Tap map to change location"
          >
            <View style={styles.markerContainer}>
              <MapPin size={32} color={PrimaryColors.main} fill={PrimaryColors.main} />
            </View>
          </Marker>
        )}
      </MapView>

      {showCurrentLocationButton && (
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={getCurrentLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={PrimaryColors.main} size="small" />
          ) : (
            <Navigation size={20} color={PrimaryColors.main} />
          )}
        </TouchableOpacity>
      )}

      {selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationInfoText}>
            📍 {parseFloat(String(selectedLocation.latitude)).toFixed(6)}, {parseFloat(String(selectedLocation.longitude)).toFixed(6)}
          </Text>
        </View>
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
  map: {
    flex: 1,
    width: '100%',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: NeutralColors.cardBackground,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  locationInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: NeutralColors.cardBackground,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationInfoText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});

