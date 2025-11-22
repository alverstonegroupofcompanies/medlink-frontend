import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';

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
  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.fallbackContainer}>
        <MapPin size={48} color={PrimaryColors.main} />
        <View style={styles.fallbackText}>
          <Text style={styles.fallbackTitle}>Live Tracking Map</Text>
          <Text style={styles.fallbackSubtitle}>
            {doctors.length} doctor(s) active
          </Text>
          <Text style={styles.fallbackNote}>
            Map view available on mobile devices
          </Text>
        </View>
      </View>
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
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F2',
    padding: 24,
  },
  fallbackText: {
    marginTop: 16,
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  fallbackSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  fallbackNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
});

