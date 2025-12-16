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
import { useSafeBottomPadding } from '@/components/screen-safe-area';
import API from '../api';
import * as Location from 'expo-location';
import { BASE_BACKEND_URL } from '@/config/api';

const { width } = Dimensions.get('window');

export default function ApprovedApplicationsScreen() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const safeBottomPadding = useSafeBottomPadding();

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

  const handleStartTracking = async (application: any) => {
    if (!application.job_session) {
      Alert.alert('Error', 'Job session not found');
      return;
    }

    if (application.job_session.tracking_started_at) {
      router.push(`/check-in/${application.job_session.id}`);
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required to start tracking.');
        return;
      }

      setCheckingIn(application.job_session.id);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      const response = await API.post('/doctor/start-tracking', {
        job_session_id: application.job_session.id,
        latitude,
        longitude,
      });

      Alert.alert(
        '✅ Location Tracking Started!',
        'Your live location is now being shared with the hospital.',
        [
          {
            text: 'View Tracking',
            onPress: () => router.push(`/check-in/${application.job_session.id}`),
          },
          {
            text: 'OK',
            onPress: () => loadApplications(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Start tracking error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start location tracking');
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
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: safeBottomPadding }]}
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
            
            // Tracking window status
            const trackingStatus = application.tracking_status;
            const canStartTracking = application.can_start_tracking;
            const timeUntilTracking = application.time_until_tracking_formatted;
            const timeRemainingInWindow = application.time_remaining_formatted;
            const minutesUntilCancellation = application.minutes_until_cancellation;
            const isWithinWarningPeriod = application.is_within_warning_period;
            const autoCancelled = application.auto_cancelled;

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

                {/* Tracking Window Status */}
                {trackingStatus && trackingStatus !== 'no_session' && (
                  <View style={styles.trackingStatusContainer}>
                    {trackingStatus === 'too_early' && (
                      <View style={[styles.trackingBadge, styles.tooEarlyBadge]}>
                        <Clock size={16} color={NeutralColors.textSecondary} />
                        <View style={styles.trackingBadgeContent}>
                          <Text style={[styles.trackingBadgeText, { color: NeutralColors.textSecondary }]}>
                            Tracking starts in: {timeUntilTracking}
                          </Text>
                          <Text style={styles.trackingBadgeSubtext}>
                            You can start tracking 1h before your shift
                          </Text>
                        </View>
                      </View>
                    )}
                    {trackingStatus === 'active' && !isWithinWarningPeriod && (
                      <View style={[styles.trackingBadge, styles.activeBadge]}>
                        <View style={styles.pulseDot} />
                        <View style={styles.trackingBadgeContent}>
                          <Text style={[styles.trackingBadgeText, { color: StatusColors.success }]}>
                            🚨 Tracking Required Now!
                          </Text>
                          <Text style={styles.trackingBadgeSubtext}>
                            {minutesUntilCancellation !== null && minutesUntilCancellation > 10 ? (
                              `${minutesUntilCancellation} minutes until auto-cancel`
                            ) : (
                              `Time remaining: ${timeRemainingInWindow}`
                            )}
                          </Text>
                        </View>
                      </View>
                    )}
                    {trackingStatus === 'active' && isWithinWarningPeriod && (
                      <View style={[styles.trackingBadge, styles.urgentWarningBadge]}>
                        <View style={[styles.pulseDot, { backgroundColor: StatusColors.error }]} />
                        <View style={styles.trackingBadgeContent}>
                          <Text style={[styles.trackingBadgeText, { color: StatusColors.error, fontSize: 16, fontWeight: '800' }]}>
                            ⚠️ URGENT: {minutesUntilCancellation} MIN LEFT!
                          </Text>
                          <Text style={[styles.trackingBadgeSubtext, { color: StatusColors.error, fontWeight: '600' }]}>
                            Start tracking NOW or session will be cancelled!
                          </Text>
                        </View>
                      </View>
                    )}
                    {trackingStatus === 'started' && (
                      <View style={[styles.trackingBadge, styles.startedBadge]}>
                        <CheckCircle size={16} color={StatusColors.success} />
                        <View style={styles.trackingBadgeContent}>
                          <Text style={[styles.trackingBadgeText, { color: StatusColors.success }]}>
                            ✓ Tracking Active
                          </Text>
                          <Text style={styles.trackingBadgeSubtext}>
                            Started: {new Date(application.tracking_started_at).toLocaleTimeString()}
                          </Text>
                        </View>
                      </View>
                    )}
                    {trackingStatus === 'expired' && (
                      <View style={[styles.trackingBadge, styles.expiredBadge]}>
                        <XCircle size={16} color={StatusColors.error} />
                        <View style={styles.trackingBadgeContent}>
                          <Text style={[styles.trackingBadgeText, { color: StatusColors.error }]}>
                            {autoCancelled ? 'Session Auto-Cancelled' : 'Tracking Window Expired'}
                          </Text>
                          <Text style={styles.trackingBadgeSubtext}>
                            {autoCancelled ? 'Tracking not started on time' : 'Contact hospital for assistance'}
                          </Text>
                        </View>
                      </View>
                    )}
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

                {/* Action Buttons */}
                {needsCheckIn && !autoCancelled && (
                  <TouchableOpacity
                    style={[
                      styles.checkInButton,
                      !canStartTracking && styles.checkInButtonDisabled,
                      trackingStatus === 'active' && !isWithinWarningPeriod && styles.urgentButton,
                      isWithinWarningPeriod && styles.criticalUrgentButton,
                    ]}
                    onPress={() => handleStartTracking(application)}
                    disabled={!canStartTracking}
                  >
                    {trackingStatus === 'too_early' ? (
                      <>
                        <Clock size={20} color="#fff" />
                        <Text style={styles.checkInButtonText}>Too Early - Wait {timeUntilTracking}</Text>
                      </>
                    ) : isWithinWarningPeriod ? (
                      <>
                        <Navigation size={20} color="#fff" />
                        <Text style={[styles.checkInButtonText, { fontSize: 18, fontWeight: '900' }]}>
                          ⚠️ START NOW - {minutesUntilCancellation} MIN!
                        </Text>
                      </>
                    ) : trackingStatus === 'active' ? (
                      <>
                        <Navigation size={20} color="#fff" />
                        <Text style={styles.checkInButtonText}>Start Tracking Now!</Text>
                      </>
                    ) : trackingStatus === 'started' ? (
                      <>
                        <Navigation size={20} color="#fff" />
                        <Text style={styles.checkInButtonText}>View Live Tracking</Text>
                      </>
                    ) : trackingStatus === 'expired' ? (
                      <>
                        <XCircle size={20} color="#fff" />
                        <Text style={styles.checkInButtonText}>Window Expired</Text>
                      </>
                    ) : (
                      <>
                        <Navigation size={20} color="#fff" />
                        <Text style={styles.checkInButtonText}>View Details & Check In</Text>
                      </>
                    )}
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
    // paddingBottom is now set dynamically using safeBottomPadding
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
  // New tracking status styles
  trackingStatusContainer: {
    marginBottom: 12,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  trackingBadgeContent: {
    flex: 1,
  },
  trackingBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  trackingBadgeSubtext: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
  },
  tooEarlyBadge: {
    backgroundColor: NeutralColors.background,
    borderWidth: 1,
    borderColor: NeutralColors.divider,
  },
  activeBadge: {
    backgroundColor: StatusColors.success + '15',
    borderWidth: 2,
    borderColor: StatusColors.success,
  },
  startedBadge: {
    backgroundColor: StatusColors.success + '15',
  },
  expiredBadge: {
    backgroundColor: StatusColors.error + '15',
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: StatusColors.success,
    // Note: Animation would need to be added with Animated API
  },
  urgentWarningBadge: {
    backgroundColor: StatusColors.error + '15',
    borderWidth: 3,
    borderColor: StatusColors.error,
  },
  urgentButton: {
    backgroundColor: StatusColors.success,
    shadowColor: StatusColors.success,
  },
  criticalUrgentButton: {
    backgroundColor: StatusColors.error,
    shadowColor: StatusColors.error,
  },
});

