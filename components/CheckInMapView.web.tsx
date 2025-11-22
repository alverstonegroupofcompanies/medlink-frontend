import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors } from '@/constants/doctor-theme';

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
  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.fallbackContainer}>
        <MapPin size={48} color={PrimaryColors.main} />
        <View style={styles.fallbackText}>
          <Text style={styles.fallbackTitle}>Check-In Map</Text>
          <Text style={styles.fallbackSubtitle}>
            Hospital: {hospitalLocation.name}
          </Text>
          <Text style={styles.fallbackSubtitle}>
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
    marginVertical: 12,
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
});

