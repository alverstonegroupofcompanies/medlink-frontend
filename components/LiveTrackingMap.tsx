import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform, Dimensions, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, AnimatedRegion } from 'react-native-maps';
import echo from '../services/echo';
import { MapPin } from 'lucide-react-native';
import { getFullImageUrl } from '@/utils/url-helper';
import { Image } from 'react-native';

const { width } = Dimensions.get('window');

interface Doctor {
  doctor_id: number;
  doctor_name: string;
  latitude: number | string;
  longitude: number | string;
  profile_photo?: string;
  [key: string]: any;
}

interface LiveTrackingMapProps {
  doctors: Doctor[];
  hospital?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  height?: number;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

// Separate component for individual doctor marker to handle own animation state
const DoctorMarker = React.memo(({ doctor }: { doctor: Doctor }) => {
  const latitude = typeof doctor.latitude === 'number' ? doctor.latitude : parseFloat(doctor.latitude as string);
  const longitude = typeof doctor.longitude === 'number' ? doctor.longitude : parseFloat(doctor.longitude as string);
  
  if (isNaN(latitude) || isNaN(longitude)) return null;

  // Use ref to hold the AnimatedRegion so it doesn't reset on re-renders
  const coordinateRef = useRef(new AnimatedRegion({
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })).current;

  // Animate when props change
  useEffect(() => {
    const newCoordinate = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    if (Platform.OS === 'android') {
       // Android often works better with immediate updates or custom animateMarkerToCoordinate if ref available
       // But keeping consistency with existing logic:
       (coordinateRef as any).timing({
          ...newCoordinate,
          useNativeDriver: false,
          duration: 500
       }).start();
    } else {
       (coordinateRef as any).timing({
          ...newCoordinate,
          duration: 2000,
          useNativeDriver: false
       }).start();
    }
  }, [latitude, longitude]);

  // Echo Listener for this specific doctor
  useEffect(() => {
    // We can listen individually, OR rely on parent polling.
    // If we rely on Echo, we update the coordinateRef directly.
    const channel = echo.private(`location.${doctor.doctor_id}`);
    channel.listen('.LocationUpdated', (e: any) => {
        // console.log(`Live update for ${doctor.doctor_name}:`, e);
        const newLat = parseFloat(e.latitude);
        const newLng = parseFloat(e.longitude);
        
        const newCoordinate = {
            latitude: newLat,
            longitude: newLng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };

        if (Platform.OS === 'android') {
            (coordinateRef as any).timing({
                ...newCoordinate,
                useNativeDriver: false,
                duration: 500
            }).start();
        } else {
            (coordinateRef as any).timing({ 
                ...newCoordinate, 
                duration: 2000, 
                useNativeDriver: false 
            }).start();
        }
    });

    return () => {
        channel.stopListening('.LocationUpdated');
    };
  }, [doctor.doctor_id]);

  return (
    <Marker.Animated
      coordinate={coordinateRef}
      title={doctor.doctor_name}
      anchor={{ x: 0.5, y: 0.5 }}
    >
        <View style={styles.markerContainer}>
            {doctor.profile_photo ? (
                 <Image 
                    source={{ uri: getFullImageUrl(doctor.profile_photo) }}
                    style={styles.markerImage}
                 />
            ) : (
                <MapPin size={24} color="#fff" fill="#E11D48" />
            )}
            <View style={styles.onlineBadge} />
        </View>
    </Marker.Animated>
  );
});

export const LiveTrackingMap = React.memo(({ doctors, hospital, height = 400, initialRegion }: LiveTrackingMapProps) => {
  const mapRef = useRef<MapView>(null);
  
  // Only use initialRegion ONCE
  const initialRegionRef = useRef(initialRegion);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegionRef.current || {
          latitude: hospital?.latitude || 0,
          longitude: hospital?.longitude || 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Show Job Location Marker instead of generic Hospital Marker if available */}
        {doctors.length > 0 && doctors[0].job_latitude && doctors[0].job_longitude ? (
             <Marker 
                coordinate={{ 
                    latitude: typeof doctors[0].job_latitude === 'number' ? doctors[0].job_latitude : parseFloat(doctors[0].job_latitude),
                    longitude: typeof doctors[0].job_longitude === 'number' ? doctors[0].job_longitude : parseFloat(doctors[0].job_longitude)
                }}
                title={doctors[0].job_name || "Job Location"}
            >
                <View style={[styles.markerContainer, { borderColor: '#2563EB' }]}>
                    <MapPin size={24} color="#2563EB" fill="#2563EB" />
                </View>
            </Marker>
        ) : hospital && (
            <Marker 
                coordinate={{ latitude: hospital.latitude, longitude: hospital.longitude }}
                title={hospital.name}
            >
                <View style={[styles.markerContainer, { borderColor: '#2563EB' }]}>
                    <MapPin size={24} color="#2563EB" fill="#2563EB" />
                </View>
            </Marker>
        )}

        {doctors.map(doctor => (
            <DoctorMarker key={doctor.doctor_id} doctor={doctor} />
        ))}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
    width: '100%',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  markerContainer: {
    padding: 2,
    backgroundColor: 'white',
    borderRadius: 24, // Half of width/height
    borderWidth: 2,
    borderColor: '#E11D48',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48, // Increased from 40
    height: 48, // Increased from 40
  },
  markerImage: {
      width: 40, // Increased from 32
      height: 40, // Increased from 32
      borderRadius: 20, // Half of width/height
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#fff',
  }
});
