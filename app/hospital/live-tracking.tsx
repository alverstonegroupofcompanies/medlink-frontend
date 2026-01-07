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
  Image,
  Platform,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MapPin, User, CheckCircle, Clock, Navigation, Timer, ChevronLeft } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import API from '../api';
import { LiveTrackingMap } from '@/components/LiveTrackingMap';
import * as Location from 'expo-location';
import { getFullImageUrl } from '@/utils/url-helper';
import { formatISTDateTime, formatISTTimeOnly } from '@/utils/timezone';

const { width, height } = Dimensions.get('window');

export default function LiveTrackingScreen() {
  const { sessionId, doctorId } = useLocalSearchParams<{ sessionId: string, doctorId: string }>();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospital, setHospital] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(doctorId || null);
  const pollIntervalRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchTrackingData();
      startPolling();

      return () => {
        stopPolling();
      };
    }, [])
  );
  
  // Update selected doctor when params change
  React.useEffect(() => {
    if (doctorId) {
      setSelectedDoctor(doctorId);
    }
  }, [doctorId]);

  const startPolling = () => {
    stopPolling();
    pollIntervalRef.current = setInterval(fetchTrackingData, 3000); // Poll every 3 seconds for live updates
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const fetchTrackingData = async () => {
    try {
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

  // Filter unique doctors logic - Only show doctors who have enabled location sharing
  const uniqueDoctors = doctors
    .filter(d => {
      // 1. Basic status filter
      if (d.status === 'completed' || d.status === 'cancelled' || d.status === 'rejected') return false;
      
      // 2. Only show doctors who have enabled location sharing
      if (d.location_sharing_status !== 'active') return false;
      
      // 3. Focused tracking filter: if doctorId param exists, ONLY show that doctor
      if (doctorId && String(d.doctor_id) !== String(doctorId)) return false;
      
      return true;
    })
    .sort((a, b) => {
        // Prioritize actively checking in
        if (a.check_in_time && !b.check_in_time) return -1;
        if (!a.check_in_time && b.check_in_time) return 1;
        
        // Then by latest updated location
        const timeA = a.location_updated_at ? new Date(a.location_updated_at).getTime() : 0;
        const timeB = b.location_updated_at ? new Date(b.location_updated_at).getTime() : 0;
        return timeB - timeA;
    })
    .reduce((acc: any[], current) => {
    const x = acc.find(item => item.doctor_id === current.doctor_id);
    if (!x) {
      return acc.concat([current]);
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
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.headerLeft}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {doctorId ? (
             <ChevronLeft size={28} color="#fff" />
          ) : (
             <ChevronLeft size={28} color="#fff" />
          )}
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
                {doctorId ? 'Tracking Doctor' : 'Live Tracking'}
            </Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
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
                  d.location_sharing_status === 'active' &&
                  d.latitude && d.longitude && 
                  !isNaN(parseFloat(d.latitude)) && !isNaN(parseFloat(d.longitude))
                ).map(d => ({
                  ...d,
                  latitude: typeof d.latitude === 'number' ? d.latitude : parseFloat(d.latitude),
                  longitude: typeof d.longitude === 'number' ? d.longitude : parseFloat(d.longitude),
                  job_latitude: d.job_latitude || d.job_requirement?.latitude,
                  job_longitude: d.job_longitude || d.job_requirement?.longitude,
                  job_name: d.job_name || d.job_requirement?.location_name || d.job_requirement?.department || 'Job Site'
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
                <MapPin size={40} color={NeutralColors.textSecondary} />
                <Text style={styles.mapPlaceholderText}>
                  Waiting for location updates...
                </Text>
              </View>
            )}
          </View>

          {/* Doctors List */}
          <View style={styles.doctorsListContainer}>
            <View style={styles.doctorsListHeader}>
                <Text style={styles.sectionTitle}>
                Active Doctors <Text style={{ color: NeutralColors.textSecondary, fontWeight: '400' }}>({uniqueDoctors.length})</Text>
                </Text>
            </View>
            
            <ScrollView
                style={styles.doctorsList}
                contentContainerStyle={styles.doctorsListContent}
                showsVerticalScrollIndicator={false}
            >
                {uniqueDoctors.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <User size={48} color={NeutralColors.textTertiary} />
                    </View>
                    <Text style={styles.emptyTitle}>No Doctors Sharing Location</Text>
                    <Text style={styles.emptyText}>
                    Doctors will appear here only after they enable live location sharing. Location is only shown when doctors actively share it.
                    </Text>
                </View>
                ) : (
                <>
                    {uniqueDoctors.map((doctor, index) => {
                    const doctorLat = typeof doctor.latitude === 'number' ? doctor.latitude : parseFloat(doctor.latitude || '0');
                    const doctorLng = typeof doctor.longitude === 'number' ? doctor.longitude : parseFloat(doctor.longitude || '0');
                    const hospitalLat = hospital?.latitude ? (typeof hospital.latitude === 'number' ? hospital.latitude : parseFloat(hospital.latitude)) : null;
                    const hospitalLng = hospital?.longitude ? (typeof hospital.longitude === 'number' ? hospital.longitude : parseFloat(hospital.longitude)) : null;
                    
                    const distance = (hospitalLat !== null && hospitalLng !== null && !isNaN(doctorLat) && !isNaN(doctorLng))
                        ? calculateDistance(
                            doctorLat,
                            doctorLng,
                            hospitalLat,
                            hospitalLng
                        )
                        : null;

                    const locationUpdatedAt = doctor.location_updated_at ? new Date(doctor.location_updated_at) : null;
                    const isOffline = doctor.hasOwnProperty('is_online') 
                        ? !doctor.is_online 
                        : (locationUpdatedAt ? (Date.now() - locationUpdatedAt.getTime()) > 120000 : true);

                    const etaMinutes = distance ? Math.round((distance / 30) * 60) : null;

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
                        activeOpacity={0.8}
                        >
                        <View style={styles.doctorHeader}>
                            <View style={styles.doctorIconContainer}>
                                <Image 
                                    source={{ uri: getFullImageUrl(doctor.profile_photo) }}
                                    style={styles.doctorListImage}
                                />
                                {!isOffline && (
                                    <View style={styles.onlineBadge} />
                                )}
                            </View>
                            
                            <View style={styles.doctorInfo}>
                            <View style={styles.nameRow}>
                                <Text style={styles.doctorName} numberOfLines={1}>{doctor.doctor_name}</Text>
                                {isOffline && (
                                <View style={styles.offlineTag}>
                                    <Text style={styles.offlineTagText}>OFFLINE</Text>
                                </View>
                                )}
                            </View>
                            <Text style={styles.doctorDepartment} numberOfLines={1}>{doctor.department}</Text>
                            
                            <View style={styles.quickStatusRow}>
                                {distance !== null ? (
                                    <Text style={styles.distanceText}>
                                        <Navigation size={12} color={PrimaryColors.main} /> {distance < 1 ? `${Math.round(distance*1000)}m` : `${distance.toFixed(1)}km`} away
                                    </Text>
                                ) : (
                                    <Text style={styles.distanceText}>Location unavailable</Text>
                                )}
                                {etaMinutes !== null && !isOffline && (
                                    <Text style={styles.etaText}>
                                        • ~{etaMinutes} min
                                    </Text>
                                )}
                            </View>
                            </View>
                            
                            <View style={styles.statusIconData}>
                                {doctor.check_in_verified ? (
                                    <View style={styles.verifiedContainer}>
                                        <CheckCircle size={14} color="#fff" />
                                    </View>
                                ) : (
                                    null 
                                )}
                            </View>
                        </View>

                        {/* Expanded Details */}
                        {selectedDoctor === doctor.doctor_id && (
                            <View style={styles.doctorDetails}>
                            <View style={styles.detailGrid}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Last Updated</Text>
                                    <Text style={styles.detailValue}>
                                    {doctor.location_updated_at ? (
                                        `${formatISTTimeOnly(doctor.location_updated_at)} • ${getTimeAgo(doctor.location_updated_at)}`
                                    ) : 'Never'}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Checked In</Text>
                                    <Text style={styles.detailValue}>
                                        {doctor.check_in_time ? new Date(doctor.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Not yet'}
                                    </Text>
                                </View>
                            </View>
                            
                            {doctorLat && doctorLng && !isNaN(doctorLat) ? (
                                <View style={styles.locationContainer}>
                                    <MapPin size={14} color={NeutralColors.textSecondary} />
                                    <Text style={styles.locationTextAddress}>
                                        {`${doctorLat.toFixed(5)}, ${doctorLng.toFixed(5)}`}
                                    </Text>
                                </View>
                            ) : null}
                            </View>
                        )}
                        </TouchableOpacity>
                    );
                    })}
                </>
                )}
            </ScrollView>
          </View>
      </View>
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
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: PrimaryColors.main,
  },
  headerLeft: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  headerRight: {
    width: 40,
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1, 
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
  mapContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'relative',
    zIndex: 1,
  },
  mapPlaceholder: {
    height: height * 0.40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NeutralColors.background,
  },
  mapPlaceholderText: {
    marginTop: 16,
    fontSize: 15,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NeutralColors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: NeutralColors.textSecondary,
  },
  doctorsListContainer: {
      flex: 1,
      backgroundColor: NeutralColors.background,
  },
  doctorsListHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  doctorsList: {
    flex: 1,
  },
  doctorsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  doctorCardSelected: {
    borderColor: PrimaryColors.main,
    backgroundColor: '#F8FAFC',
    shadowOpacity: 0.08,
    elevation: 3,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
  },
  doctorDepartment: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  doctorCardOffline: {
    opacity: 0.8,
    backgroundColor: '#FAFAFA',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  doctorListImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  offlineTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  offlineTagText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  quickStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  etaText: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
    marginLeft: 4,
  },
  statusIconData: {
      marginLeft: 'auto',
  },
  verifiedContainer: {
      backgroundColor: StatusColors.success,
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },
  detailGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
      backgroundColor: '#fff',
  },
  detailItem: {
      flex: 1,
  },
  detailLabel: {
      fontSize: 11,
      color: NeutralColors.textSecondary,
      marginBottom: 2,
      textTransform: 'uppercase',
      fontWeight: '600',
  },
  detailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: NeutralColors.textPrimary,
  },
  locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
  },
  locationTextAddress: {
      fontSize: 12,
      color: NeutralColors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
