import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import MapView from 'react-native-maps';
import { Marker } from 'react-native-maps';

interface DoctorLocation {
  doctor_id: number;
  doctor_name: string;
  latitude: number;
  longitude: number;
  department?: string;
  check_in_verified?: boolean;
}

interface LiveTrackingMapProps {
  hospital: {
    latitude: number;
    longitude: number;
    name: string;
  };
  doctors: DoctorLocation[];
  height?: number;
}

export function LiveTrackingMap({ hospital, doctors, height = 400 }: LiveTrackingMapProps) {
  // Ensure hospital coordinates are numbers
  const hospitalLat = typeof hospital.latitude === 'number' ? hospital.latitude : parseFloat(hospital.latitude || '0');
  const hospitalLng = typeof hospital.longitude === 'number' ? hospital.longitude : parseFloat(hospital.longitude || '0');

  const [region, setRegion] = useState({
    latitude: hospitalLat,
    longitude: hospitalLng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    // Calculate region to show all doctors and hospital
    if (doctors.length > 0) {
      // Ensure all coordinates are numbers
      const allLats = [hospitalLat, ...doctors.map(d => {
        const lat = typeof d.latitude === 'number' ? d.latitude : parseFloat(d.latitude || '0');
        return isNaN(lat) ? hospitalLat : lat;
      })];
      const allLngs = [hospitalLng, ...doctors.map(d => {
        const lng = typeof d.longitude === 'number' ? d.longitude : parseFloat(d.longitude || '0');
        return isNaN(lng) ? hospitalLng : lng;
      })];
      
      const minLat = Math.min(...allLats);
      const maxLat = Math.max(...allLats);
      const minLng = Math.min(...allLngs);
      const maxLng = Math.max(...allLngs);
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const latDelta = Math.max((maxLat - minLat) * 1.5, 0.01);
      const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.01);
      
      setRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      });
    }
  }, [doctors, hospitalLat, hospitalLng]);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapType="standard"
      >
        {/* Hospital Marker */}
        {!isNaN(hospitalLat) && !isNaN(hospitalLng) && (
          <Marker
            coordinate={{
              latitude: hospitalLat,
              longitude: hospitalLng,
            }}
            title={hospital.name}
            description="Hospital Location"
            pinColor="#2E9E9E"
          />
        )}

        {/* Doctor Markers */}
        {doctors.map((doctor) => {
          // Ensure coordinates are numbers
          const doctorLat = typeof doctor.latitude === 'number' ? doctor.latitude : parseFloat(doctor.latitude || '0');
          const doctorLng = typeof doctor.longitude === 'number' ? doctor.longitude : parseFloat(doctor.longitude || '0');
          
          // Only render marker if coordinates are valid
          if (isNaN(doctorLat) || isNaN(doctorLng)) {
            return null;
          }
          
          return (
            <Marker
              key={doctor.doctor_id}
              coordinate={{
                latitude: doctorLat,
                longitude: doctorLng,
              }}
              title={doctor.doctor_name}
              description={doctor.department || 'Doctor'}
              pinColor={doctor.check_in_verified ? '#10B981' : '#F59E0B'}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
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
});

