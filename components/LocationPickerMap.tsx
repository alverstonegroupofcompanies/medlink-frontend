import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Region, UrlTile } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';
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
  const [region, setRegion] = useState<Region>({
    latitude: typeof initialLatitude === 'number' ? initialLatitude : parseFloat(initialLatitude as string) || 20.5937,
    longitude: typeof initialLongitude === 'number' ? initialLongitude : parseFloat(initialLongitude as string) || 78.9629,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      const lat = typeof initialLatitude === 'number' ? initialLatitude : parseFloat(initialLatitude as string);
      const lng = typeof initialLongitude === 'number' ? initialLongitude : parseFloat(initialLongitude as string);
      
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        setRegion(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        if (loading) setLoading(false);
        return;
      }
    }
    if (loading) setLoading(false);
  }, [initialLatitude, initialLongitude]);

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    onLocationSelect(newRegion.latitude, newRegion.longitude);
  };

  if (loading) {
    return (
      <View style={[styles.container, { height, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={PrimaryColors.main} />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={region}
        mapType="none" // Hide default map (Google/Apple) to use OSM tiles
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />
      </MapView>
      
      {/* Center Pin Overlay */}
      <View style={styles.pinOverlay} pointerEvents="none">
        <MapPin size={40} color={PrimaryColors.main} fill={PrimaryColors.main} />
        <View style={styles.pinShadow} />
      </View>

      <View style={styles.instructionOverlay} pointerEvents="none">
        <Text style={styles.instructionText}>Move map to align pin</Text>
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
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  pinOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40, // Adjust to make the pin point exactly at center
  },
  pinShadow: {
    width: 10,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 5,
    marginTop: 2,
  },
  instructionOverlay: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
