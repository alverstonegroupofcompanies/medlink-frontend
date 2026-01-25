import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors } from '@/constants/doctor-theme';
import MapView from 'react-native-maps';
import { Marker } from 'react-native-maps';
import { UBER_LIKE_MAP_STYLE } from '@/utils/map-style';

interface CheckInMapViewProps {
  hospitalLocation: {
    latitude: number;
    longitude: number;
    name: string;
  };
  doctorLocation: {
    latitude: number;
    longitude: number;
  };
  height?: number;
}

export function CheckInMapView({
  hospitalLocation,
  doctorLocation,
  height = 300,
}: CheckInMapViewProps) {
  // Ensure coordinates are numbers, not strings
  const hospitalLat = typeof hospitalLocation.latitude === 'string' 
    ? parseFloat(hospitalLocation.latitude) 
    : Number(hospitalLocation.latitude);
  const hospitalLng = typeof hospitalLocation.longitude === 'string' 
    ? parseFloat(hospitalLocation.longitude) 
    : Number(hospitalLocation.longitude);
  const doctorLat = typeof doctorLocation.latitude === 'string' 
    ? parseFloat(doctorLocation.latitude) 
    : Number(doctorLocation.latitude);
  const doctorLng = typeof doctorLocation.longitude === 'string' 
    ? parseFloat(doctorLocation.longitude) 
    : Number(doctorLocation.longitude);

  // Validate coordinates
  if (isNaN(hospitalLat) || isNaN(hospitalLng) || isNaN(doctorLat) || isNaN(doctorLng)) {
    console.error('Invalid coordinates:', { hospitalLat, hospitalLng, doctorLat, doctorLng });
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>Invalid location coordinates</Text>
        </View>
      </View>
    );
  }

  const [region, setRegion] = useState({
    latitude: hospitalLat,
    longitude: hospitalLng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    // Calculate region to show both hospital and doctor
    const allLats = [hospitalLat, doctorLat];
    const allLngs = [hospitalLng, doctorLng];
    
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = Math.max((maxLat - minLat) * 2, 0.005);
    const lngDelta = Math.max((maxLng - minLng) * 2, 0.005);
    
    setRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    });
  }, [hospitalLat, hospitalLng, doctorLat, doctorLng]);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapType="standard"
        customMapStyle={UBER_LIKE_MAP_STYLE as any}
        showsBuildings={true}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        {/* Hospital Marker */}
        <Marker
          coordinate={{
            latitude: hospitalLat,
            longitude: hospitalLng,
          }}
          title={hospitalLocation.name}
          description="Hospital Location"
          pinColor="#2E9E9E"
        />

        {/* Doctor Location Marker */}
        <Marker
          coordinate={{
            latitude: doctorLat,
            longitude: doctorLng,
          }}
          title="Your Location"
          description="Current Position"
          pinColor={PrimaryColors.main}
        />
      </MapView>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2E9E9E' }]} />
          <Text style={styles.legendText}>Hospital</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PrimaryColors.main }]} />
          <Text style={styles.legendText}>Your Location</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

