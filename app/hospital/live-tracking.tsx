import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MapPin, User, CheckCircle, Clock, Navigation } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import API from '../api';
import { LiveTrackingMap } from '@/components/LiveTrackingMap';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function LiveTrackingScreen() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospital, setHospital] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchTrackingData();
      startPolling();

      return () => {
        stopPolling();
      };
    }, [])
  );

  const startPolling = () => {
    stopPolling();
    pollIntervalRef.current = setInterval(fetchTrackingData, 10000); // Poll every 10 seconds
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const fetchTrackingData = async () => {
    try {
      // Don't set loading on subsequent polls to avoid flicker
      if (!doctors.length) setLoading(true);
      
      const response = await API.get('/hospital/live-doctor-locations');
      if (response.data) {
        setDoctors(response.data.doctors || []);
        setHospital(response.data.hospital);
      }
    } catch (error) {
      console.error('Error fetching live locations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter unique doctors (if a doctor has multiple active sessions, show them once)
  const uniqueDoctors = doctors.reduce((acc: any[], current) => {
    const x = acc.find(item => item.doctor_id === current.doctor_id);
    if (!x) {
      return acc.concat([current]);
    } else {
      // If duplicate, keep the one with more recent update or valid location
      const currentHasLoc = current.latitude && current.longitude;
      const xHasLoc = x.latitude && x.longitude;
      
      if (currentHasLoc && !xHasLoc) {
        return acc.map(item => item.doctor_id === current.doctor_id ? current : item);
      }
      return acc;
    }
    return acc;
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
        if (seconds < 10) return "Just now";
    return Math.floor(seconds) + " seconds ago";
  };

  if (loading && !hospital) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading live locations...</Text>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.main} statusBarStyle="light-content">
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Live Doctor Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {(hospital?.latitude || uniqueDoctors.length > 0) ? (
          <LiveTrackingMap
            hospital={{
              latitude: typeof hospital?.latitude === 'number' ? hospital.latitude : parseFloat(hospital?.latitude || '0'),
              longitude: typeof hospital?.longitude === 'number' ? hospital.longitude : parseFloat(hospital?.longitude || '0'),
              name: hospital?.name || 'Hospital',
            }}
            doctors={uniqueDoctors.filter(d => 
              d.latitude && d.longitude && 
              !isNaN(parseFloat(d.latitude)) && !isNaN(parseFloat(d.longitude))
            ).map(d => ({
              ...d,
              latitude: typeof d.latitude === 'number' ? d.latitude : parseFloat(d.latitude),
              longitude: typeof d.longitude === 'number' ? d.longitude : parseFloat(d.longitude),
            }))}
            height={height * 0.40}
            initialRegion={selectedDoctor && uniqueDoctors.find(d => d.doctor_id === selectedDoctor) ? {
              latitude: parseFloat(uniqueDoctors.find(d => d.doctor_id === selectedDoctor).latitude),
              longitude: parseFloat(uniqueDoctors.find(d => d.doctor_id === selectedDoctor).longitude),
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            } : undefined}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <MapPin size={40} color={NeutralColors.textTertiary} />
            <Text style={styles.mapPlaceholderText}>
              Waiting for location updates...
            </Text>
          </View>
        )}
      </View>

      {/* Doctors List */}
      <View style={styles.doctorsListHeader}>
        <Text style={styles.sectionTitle}>
          Active Doctors ({uniqueDoctors.length})
        </Text>
      </View>
      
      <ScrollView
        style={styles.doctorsList}
        contentContainerStyle={styles.doctorsListContent}
        showsVerticalScrollIndicator={false}
      >
        {uniqueDoctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <User size={64} color={NeutralColors.textSecondary} />
            <Text style={styles.emptyTitle}>No Active Doctors</Text>
            <Text style={styles.emptyText}>
              Doctors with active sessions will appear here with their live locations.
            </Text>
          </View>
        ) : (
          <>
            {uniqueDoctors.map((doctor, index) => {
              // Ensure coordinates are valid numbers
              const doctorLat = typeof doctor.latitude === 'number' ? doctor.latitude : parseFloat(doctor.latitude || '0');
              const doctorLng = typeof doctor.longitude === 'number' ? doctor.longitude : parseFloat(doctor.longitude || '0');
              const hospitalLat = hospital?.latitude ? (typeof hospital.latitude === 'number' ? hospital.latitude : parseFloat(hospital.latitude)) : null;
              const hospitalLng = hospital?.longitude ? (typeof hospital.longitude === 'number' ? hospital.longitude : parseFloat(hospital.longitude)) : null;
              
              const distance = hospitalLat && hospitalLng && doctorLat && doctorLng && !isNaN(doctorLat) && !isNaN(doctorLng)
                ? calculateDistance(
                    doctorLat,
                    doctorLng,
                    hospitalLat,
                    hospitalLng
                  )
                : null;

              // Check if doctor is offline using backend status (matches Admin Panel)
              // If is_online is explicitly provided, use !is_online. 
              // Fallback to location check only if is_online is missing (legacy support)
              const locationUpdatedAt = doctor.location_updated_at ? new Date(doctor.location_updated_at) : null;
              const isOffline = doctor.hasOwnProperty('is_online') 
                ? !doctor.is_online 
                : (locationUpdatedAt ? (Date.now() - locationUpdatedAt.getTime()) > 120000 : true);

              return (
                <TouchableOpacity
                  key={`unique-doctor-${doctor.doctor_id}`}
                  style={[
                    styles.doctorCard,
                    selectedDoctor === doctor.doctor_id && styles.doctorCardSelected,
                    isOffline && styles.doctorCardOffline,
                  ]}
                  onPress={() => setSelectedDoctor(
                    selectedDoctor === doctor.doctor_id ? null : doctor.doctor_id
                  )}
                >
                  <View style={styles.doctorHeader}>
                    <View style={styles.doctorIcon}>
                      <User size={24} color={PrimaryColors.main} />
                    </View>
                    <View style={styles.doctorInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Live Status Indicator */}
                        {!isOffline ? (
                          <View style={styles.onlineIndicatorContainer}>
                            <View style={styles.onlinePulse} />
                            <View style={styles.onlineDot} />
                          </View>
                        ) : (
                          <View style={styles.offlineDot} />
                        )}
                        <Text style={styles.doctorName}>{doctor.doctor_name}</Text>
                        {isOffline && (
                          <View style={styles.offlineBadge}>
                            <Text style={styles.offlineBadgeText}>OFFLINE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.doctorDepartment}>{doctor.department}</Text>
                    </View>
                    <View style={styles.statusIndicator}>
                      {doctor.check_in_verified ? (
                        <CheckCircle size={20} color={StatusColors.success} />
                      ) : (
                        <Clock size={20} color={StatusColors.warning} />
                      )}
                    </View>
                  </View>

                  {selectedDoctor === doctor.doctor_id && (
                    <View style={styles.doctorDetails}>
                      <View style={styles.detailRow}>
                        <MapPin size={16} color={NeutralColors.textSecondary} />
                        <Text style={styles.detailText}>
                          {doctorLat && doctorLng && !isNaN(doctorLat) && !isNaN(doctorLng)
                            ? `${doctorLat.toFixed(6)}, ${doctorLng.toFixed(6)}`
                            : 'Location not available'}
                        </Text>
                      </View>
                      {distance !== null && (
                        <View style={styles.detailRow}>
                          <Navigation size={16} color={PrimaryColors.main} />
                          <Text style={styles.detailText}>
                            {distance < 1 
                              ? `${Math.round(distance * 1000)}m from hospital` 
                              : `${distance.toFixed(2)} km from hospital`}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Clock size={16} color={NeutralColors.textSecondary} />
                        <Text style={styles.detailText}>
                          Updated {getTimeAgo(doctor.location_updated_at)}
                        </Text>
                      </View>
                      {doctor.check_in_time && (
                        <View style={styles.detailRow}>
                          <CheckCircle size={16} color={StatusColors.success} />
                          <Text style={styles.detailText}>
                            Checked in: {new Date(doctor.check_in_time).toLocaleTimeString()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: PrimaryColors.main,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  mapContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NeutralColors.background,
  },
  mapPlaceholderText: {
    marginTop: 16,
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  // Disabled styles removed
  doctorsList: {
    flex: 1,
  },
  doctorsListContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 16,
  },
  doctorsListHeader: {
    backgroundColor: NeutralColors.background,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  doctorCardSelected: {
    borderColor: PrimaryColors.main,
    backgroundColor: '#F0F9FF',
    shadowOpacity: 0.12,
    elevation: 3,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PrimaryColors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  doctorDepartment: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  statusIndicator: {
    marginLeft: 12,
  },
  doctorDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    flex: 1,
  },
  doctorCardOffline: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  offlineBadge: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  offlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  onlineIndicatorContainer: {
    width: 12,
    height: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlinePulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    opacity: 0.4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});
