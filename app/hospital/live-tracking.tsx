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
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MapPin, User, CheckCircle, Clock, Navigation, Timer } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import API from '../api';
import { LiveTrackingMap } from '@/components/LiveTrackingMap';
import * as Location from 'expo-location';
import { getFullImageUrl } from '@/utils/url-helper';

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

  // Filter unique doctors logic
  const uniqueDoctors = doctors
    .filter(d => {
      // 1. Basic status filter
      if (d.status === 'completed' || d.status === 'cancelled' || d.status === 'rejected') return false;
      
      // 2. Focused tracking filter: if doctorId param exists, ONLY show that doctor
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
        {doctorId ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerLeft}>
             <Navigation size={24} color="#fff" style={{ transform: [{ rotate: '180deg' }] }} /> 
             {/* Using Navigation icon as back arrow counterpart or just use ArrowLeft if imported. 
                 But file only imports Navigation. Let's stick to what we have or add ArrowLeft import if needed.
                 Wait, ArrowLeft is NOT imported. Let's just use empty view if no doctorId, or 'Back' text.
                 Actually, let's keep it simple: If doctorId, show "Tracking Doctor".
             */}
          </TouchableOpacity>
        ) : (
          <View style={styles.headerLeft} />
        )}
        <Text style={styles.headerTitle}>
            {doctorId ? 'Tracking Doctor' : 'Live Tracking'}
        </Text>
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
              // Attempt to find job location from nested job_requirement or direct fields
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
              
              const distance = (hospitalLat !== null && hospitalLng !== null && !isNaN(doctorLat) && !isNaN(doctorLng))
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

              const etaMinutes = distance ? Math.round((distance / 30) * 60) : null; // Assume 30km/h avg speed

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
                      
                      {/* Quick Status Line */}
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
                                <CheckCircle size={16} color="#fff" />
                             </View>
                        ) : (
                            <Clock size={20} color={StatusColors.warning} />
                        )}
                    </View>
                  </View>

                  {/* Expanded Details */}
                  {selectedDoctor === doctor.doctor_id && (
                    <View style={styles.doctorDetails}>
                      <View style={styles.detailGrid}>
                          <View style={styles.detailItem}>
                             <Text style={styles.detailLabel}>Last Updated</Text>
                             <Text style={styles.detailValue}>{getTimeAgo(doctor.location_updated_at)}</Text>
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
  doctorIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  doctorDepartment: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
    marginTop: 2,
  },
  doctorCardOffline: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: NeutralColors.border,
    borderWidth: 2,
    borderColor: '#fff',
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
    marginBottom: 4,
  },
  offlineTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  offlineTagText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  quickStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
  },
  detailGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      backgroundColor: '#F9FAFB',
      padding: 12,
      borderRadius: 8,
  },
  detailItem: {
      flex: 1,
  },
  detailLabel: {
      fontSize: 11,
      color: NeutralColors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: NeutralColors.textPrimary,
  },
  locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
  },
  locationTextAddress: {
      fontSize: 12,
      color: NeutralColors.textSecondary,
      fontFamily: 'monospace',
  },
});
