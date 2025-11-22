import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MapPin, Clock, CheckCircle, XCircle, Building2, Navigation } from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import API from '../api';
import * as Location from 'expo-location';
import { BASE_BACKEND_URL } from '@/config/api';

const { width } = Dimensions.get('window');

export default function ApprovedApplicationsScreen() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await API.get('/doctor/approved-applications');
      setApplications(response.data.applications || []);
    } catch (error: any) {
      console.error('Error loading approved applications:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
    
    // Refresh every 30 seconds to update countdown timers
    const interval = setInterval(() => {
      loadApplications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadApplications();
    }, [])
  );

  const handleCheckIn = async (application: any) => {
    if (!application.job_session) {
      Alert.alert('Error', 'Job session not found');
      return;
    }


    if (application.job_session.check_in_time) {
      Alert.alert('Already Checked In', 'You have already checked in for this session.');
      return;
    }

    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required to check in.');
        return;
      }

      setCheckingIn(application.job_session.id);

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Call check-in API
      const response = await API.post('/doctor/check-in', {
        job_session_id: application.job_session.id,
        latitude,
        longitude,
      });

      Alert.alert(
        response.data.is_within_range ? 'Check-In Successful!' : 'Check-In Recorded',
        response.data.message + 
        (response.data.distance_km ? `\nDistance: ${response.data.distance_km.toFixed(2)} km` : ''),
        [
          {
            text: 'OK',
            onPress: () => {
              loadApplications();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Check-in error:', error);
      const message = error.response?.data?.message || 'Failed to check in';
      
      if (error.response?.status === 400 && error.response?.data?.time_remaining === 0) {
        Alert.alert('Time Expired', message, [
          {
            text: 'OK',
            onPress: () => {
              loadApplications();
            },
          },
        ]);
      } else {
        Alert.alert('Check-In Failed', message);
      }
    } finally {
      setCheckingIn(null);
    }
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading approved applications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {applications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building2 size={64} color={NeutralColors.textSecondary} />
            <Text style={styles.emptyTitle}>No Approved Applications</Text>
            <Text style={styles.emptyText}>
              Your approved applications will appear here. Check in to confirm your attendance.
            </Text>
          </View>
        ) : (
          applications.map((application) => {
            const session = application.job_session;
            const hospital = application.job_requirement?.hospital;
            const needsCheckIn = session && session.approved_at && !session.check_in_time;
            const isCheckedIn = session?.check_in_time;

            return (
              <View key={application.id} style={styles.applicationCard}>
                {/* Hospital Header */}
                <View style={styles.cardHeader}>
                  {hospital?.logo_url ? (
                    <Image
                      source={{ uri: hospital.logo_url }}
                      style={styles.hospitalLogo}
                    />
                  ) : (
                    <View style={styles.hospitalIcon}>
                      <Building2 size={24} color={PrimaryColors.main} />
                    </View>
                  )}
                  <View style={styles.hospitalInfo}>
                    <Text style={styles.hospitalName}>{hospital?.name || 'Hospital'}</Text>
                    <Text style={styles.department}>{application.job_requirement?.department || 'Department'}</Text>
                  </View>
                </View>

                {/* Address */}
                {hospital?.address && (
                  <View style={styles.addressRow}>
                    <MapPin size={16} color={NeutralColors.textSecondary} />
                    <Text style={styles.addressText}>{hospital.address}</Text>
                  </View>
                )}

                {/* Check-In Status */}
                <View style={styles.statusContainer}>
                  {isCheckedIn ? (
                    <View style={[styles.statusBadge, styles.checkedInBadge]}>
                      <CheckCircle size={16} color={StatusColors.success} />
                      <Text style={[styles.statusText, { color: StatusColors.success }]}>
                        Checked In
                      </Text>
                      <Text style={styles.checkInTime}>
                        {new Date(session.check_in_time).toLocaleTimeString()}
                      </Text>
                    </View>
                  ) : needsCheckIn ? (
                    <View style={[styles.statusBadge, styles.pendingBadge]}>
                      <Clock size={16} color={StatusColors.warning} />
                      <Text style={[styles.statusText, { color: StatusColors.warning }]}>
                        Check In Required
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Check-In Button */}
                {needsCheckIn && (
                  <TouchableOpacity
                    style={styles.checkInButton}
                    onPress={() => router.push(`/check-in/${session.id}`)}
                  >
                    <Navigation size={20} color="#fff" />
                    <Text style={styles.checkInButtonText}>View Details & Check In</Text>
                  </TouchableOpacity>
                )}

                {/* View Details Button for Checked In */}
                {isCheckedIn && (
                  <TouchableOpacity
                    style={[styles.checkInButton, { backgroundColor: StatusColors.success }]}
                    onPress={() => router.push(`/check-in/${session.id}`)}
                  >
                    <CheckCircle size={20} color="#fff" />
                    <Text style={styles.checkInButtonText}>View Check-In Details</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.background,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
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
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hospitalLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: PrimaryColors.lightest,
  },
  hospitalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: PrimaryColors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.divider,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: NeutralColors.textSecondary,
    marginLeft: 8,
    lineHeight: 18,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  checkedInBadge: {
    backgroundColor: StatusColors.success + '15',
  },
  pendingBadge: {
    backgroundColor: StatusColors.warning + '15',
  },
  expiredBadge: {
    backgroundColor: StatusColors.error + '15',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  checkInTime: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
  },
  timerContainer: {
    gap: 8,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: PrimaryColors.lightest,
    borderRadius: 8,
  },
  countdownLabel: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  countdownText: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: PrimaryColors.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  checkInButtonDisabled: {
    opacity: 0.6,
  },
  expiredButton: {
    backgroundColor: StatusColors.error,
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

