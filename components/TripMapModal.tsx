import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { X, MapPin } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import { CheckInMapView } from './CheckInMapView';
import { ErrorBoundary } from './ErrorBoundary';

interface TripMapModalProps {
  visible: boolean;
  onClose: () => void;
  trip?: {
    doctor?: { name?: string; profile_photo_url?: string };
    hospital?: { name?: string };
    current_latitude?: number | string | null;
    current_longitude?: number | string | null;
    destination_latitude?: number | string | null;
    destination_longitude?: number | string | null;
  } | null;
}

export const TripMapModal: React.FC<TripMapModalProps> = ({ visible, onClose, trip }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setIsReady(true), 150);
      return () => clearTimeout(timer);
    }
    setIsReady(false);
  }, [visible]);

  const hospital = {
    latitude: parseFloat(String(trip?.hospital?.latitude ?? trip?.destination_latitude ?? 0)),
    longitude: parseFloat(String(trip?.hospital?.longitude ?? trip?.destination_longitude ?? 0)),
    name: trip?.hospital?.name ?? 'Hospital location',
  };

  const doctor = {
    latitude: trip?.current_latitude ? parseFloat(String(trip.current_latitude)) : undefined,
    longitude: trip?.current_longitude ? parseFloat(String(trip.current_longitude)) : undefined,
    name: trip?.doctor?.name,
    profile: trip?.doctor?.profile_photo_url,
  };

  const isValidHospital =
    !Number.isNaN(hospital.latitude) &&
    !Number.isNaN(hospital.longitude) &&
    (hospital.latitude !== 0 || hospital.longitude !== 0);

  const isValidDoctor =
    typeof doctor.latitude === 'number' &&
    !Number.isNaN(doctor.latitude) &&
    typeof doctor.longitude === 'number' &&
    !Number.isNaN(doctor.longitude);

  const showMap = isReady && isValidHospital && isValidDoctor && Platform.OS !== 'web';

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{trip?.doctor?.name || 'Assigned Doctor'}</Text>
              <Text style={styles.subtitle}>{hospital.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {showMap ? (
              <ErrorBoundary onRetry={() => setIsReady(false)}>
                <CheckInMapView
                  hospitalLocation={{
                    latitude: hospital.latitude,
                    longitude: hospital.longitude,
                    name: hospital.name,
                  }}
                  doctorLocation={{
                    latitude: doctor.latitude ?? hospital.latitude,
                    longitude: doctor.longitude ?? hospital.longitude,
                  }}
                  doctorProfilePhoto={doctor.profile}
                  height={420}
                />
              </ErrorBoundary>
            ) : (
              <View style={styles.fallback}>
                <MapPin size={52} color={PrimaryColors.main} />
                <Text style={styles.fallbackTitle}>Map preview unavailable</Text>
                <Text style={styles.fallbackMessage}>
                  Start the trip and ensure location permissions are granted to view live map data.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: NeutralColors.cardBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
  },
  subtitle: {
    color: NeutralColors.textSecondary,
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PrimaryColors.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  fallback: {
    padding: 32,
    alignItems: 'center',
  },
  fallbackTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
  },
  fallbackMessage: {
    marginTop: 8,
    textAlign: 'center',
    color: NeutralColors.textSecondary,
  },
});

