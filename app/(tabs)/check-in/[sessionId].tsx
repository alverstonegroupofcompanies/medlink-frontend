import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MapPin, Clock, CheckCircle, Building2, Navigation, ArrowLeft, ExternalLink, Phone, Mail, Play, Square, Timer } from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import API from '../../api';
import * as Location from 'expo-location';

// Import MapView - Metro will automatically resolve .web or .native based on platform
import { MapViewComponent } from '@/components/MapView';
import { BASE_BACKEND_URL } from '@/config/api';

const { width, height } = Dimensions.get('window');

export default function CheckInDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadSession();
    getCurrentLocation();
  }, [sessionId]);

  useEffect(() => {
    // Update location every 10 seconds and send to backend
    const locationInterval = setInterval(async () => {
      await getCurrentLocation();
    }, 10000);
    
    return () => clearInterval(locationInterval);
  }, []);

  // Timer effect - AUTO-START timer after check-in
  useEffect(() => {
    if (session?.check_in_time && !session?.end_time) {
      // Calculate elapsed time since check-in
      const checkInTime = new Date(session.check_in_time);
      const updateElapsed = () => {
        const elapsed = Date.now() - checkInTime.getTime();
        setTimeElapsed(elapsed);
      };
      
      updateElapsed(); // Initial calculation
      setIsTimerRunning(true);
      
      // Auto-start timer - clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(updateElapsed, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Stop timer if checked out or completed
      setIsTimerRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // If session is completed, calculate final elapsed time
      if (session?.end_time && session?.check_in_time) {
        const checkInTime = new Date(session.check_in_time);
        const endTime = new Date(session.end_time);
        const finalElapsed = endTime.getTime() - checkInTime.getTime();
        setTimeElapsed(finalElapsed);
      }
    }
  }, [session?.check_in_time, session?.end_time]);

  useEffect(() => {
    // Send location to backend when it changes
    if (currentLocation && sessionId) {
      updateLocationOnBackend();
    }
  }, [currentLocation, sessionId]);

  useFocusEffect(
    React.useCallback(() => {
      loadSession();
      getCurrentLocation();
    }, [sessionId])
  );

  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/doctor/sessions/${sessionId}`);
      setSession(response.data.session);
      
      // Calculate distance if we have current location
      if (currentLocation && response.data.session?.jobRequirement?.hospital) {
        const hospital = response.data.session.jobRequirement.hospital;
        if (hospital.latitude && hospital.longitude) {
          const dist = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            hospital.latitude,
            hospital.longitude
          );
          setDistance(dist);
        }
      }
    } catch (error: any) {
      console.error('Error loading session:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(newLocation);

      // Calculate distance to hospital
      if (session?.jobRequirement?.hospital) {
        const hospital = session.jobRequirement.hospital;
        if (hospital.latitude && hospital.longitude) {
          const dist = calculateDistance(
            newLocation.latitude,
            newLocation.longitude,
            hospital.latitude,
            hospital.longitude
          );
          setDistance(dist);
        }
      }

      // Send location to backend for live tracking
      if (sessionId) {
        try {
          await API.post('/doctor/update-location', {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            job_session_id: parseInt(sessionId),
          });
        } catch (error) {
          console.warn('Failed to update location on backend:', error);
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  const handleCheckIn = async () => {
    // Ensure GPS is enabled
    if (!currentLocation) {
      Alert.alert(
        'GPS Required', 
        'Please enable location services to check in. GPS must be enabled for check-in.',
        [
          {
            text: 'Enable GPS',
            onPress: async () => {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                await getCurrentLocation();
              } else {
                Alert.alert('Permission Denied', 'Location permission is required for check-in.');
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    if (!session) {
      Alert.alert('Error', 'Session not found');
      return;
    }

    if (session.check_in_time) {
      Alert.alert('Already Checked In', 'You have already checked in for this session.');
      return;
    }

    // Calculate distance before check-in
    if (session?.jobRequirement?.hospital) {
      const hospital = session.jobRequirement.hospital;
      if (hospital.latitude && hospital.longitude) {
        const dist = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          hospital.latitude,
          hospital.longitude
        );
        
        const distMeters = dist * 1000;
        if (distMeters > 100) {
          Alert.alert(
            'Too Far Away',
            `You must be within 100 meters of the hospital to check in.\n\nCurrent distance: ${Math.round(distMeters)} meters\n\nPlease move closer to the hospital location.`,
            [
              {
                text: 'Retry',
                onPress: async () => {
                  await getCurrentLocation();
                  // Retry after getting new location
                  setTimeout(() => handleCheckIn(), 1000);
                }
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
      }
    }

    try {
      setCheckingIn(true);

      const response = await API.post('/doctor/check-in', {
        job_session_id: session.id,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });

      if (response.data.is_within_range !== false) {
        // Check-in successful - timer will auto-start via useEffect
        Alert.alert(
          'Check-In Successful! ✓',
          `You are within 100 meters of the hospital.\n\nTimer will start automatically.`,
          [
            {
              text: 'OK',
              onPress: () => {
                loadSession();
              },
            },
          ]
        );
      } else {
        Alert.alert('Check-In Failed', response.data.message || 'You must be within 100 meters of the hospital.');
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      const message = error.response?.data?.message || 'Failed to check in';
      
      // Check if it's a distance error
      if (error.response?.data?.distance_meters) {
        Alert.alert(
          'Check-In Failed - Too Far Away',
          `${message}\n\nPlease move within 100 meters of the hospital location.`
        );
      } else {
        Alert.alert('Check-In Failed', message);
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const openDirections = () => {
    if (!session?.jobRequirement?.hospital) return;
    
    const hospital = session.jobRequirement.hospital;
    if (hospital.latitude && hospital.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
      Linking.openURL(url).catch(err => {
        Alert.alert('Error', 'Could not open directions');
      });
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCompleteSession = async () => {
    if (completing) return;
    
    if (!isTimerRunning) {
      Alert.alert('Timer Not Running', 'The timer must be running to complete the session.');
      return;
    }

    // Calculate final elapsed time before stopping
    if (session?.check_in_time) {
      const checkInTime = new Date(session.check_in_time);
      const finalElapsed = Date.now() - checkInTime.getTime();
      setTimeElapsed(finalElapsed);
    }

    Alert.alert(
      'Complete Work & Stop Timer',
      `Are you sure you want to complete this work session?\n\nThis will:\n• Stop the live timer\n• Record the checkout time\n• Calculate total work duration\n\nTotal time: ${formatTime(timeElapsed)}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete & Stop Timer',
          onPress: async () => {
            try {
              setCompleting(true);
              
              // Stop timer first
              setIsTimerRunning(false);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }

              // Calculate final duration
              let finalDuration = timeElapsed;
              if (session?.check_in_time) {
                const checkInTime = new Date(session.check_in_time);
                finalDuration = Date.now() - checkInTime.getTime();
              }

              // Send completion request with duration
              const response = await API.post(`/doctor/sessions/${sessionId}/complete`, {
                duration_seconds: Math.floor(finalDuration / 1000),
              });
              
              Alert.alert(
                'Work Completed! ✓',
                `Your work session has been completed.\n\nCheckout time: ${new Date().toLocaleString()}\nTotal duration: ${formatTime(finalDuration)}`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      loadSession();
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error completing session:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to complete session');
              
              // Resume timer if error (only if still checked in)
              if (session?.check_in_time && !session?.end_time) {
                setIsTimerRunning(true);
                const checkInTime = new Date(session.check_in_time);
                intervalRef.current = setInterval(() => {
                  const elapsed = Date.now() - checkInTime.getTime();
                  setTimeElapsed(elapsed);
                }, 1000);
              }
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading session details...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Session not found</Text>
        </View>
      </View>
    );
  }

  const hospital = session.jobRequirement?.hospital;
  const needsCheckIn = session.approved_at && !session.check_in_time;
  const isCheckedIn = session.check_in_time;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={PrimaryColors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Check-In</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hospital Card */}
        <View style={styles.hospitalCard}>
          <View style={styles.hospitalHeader}>
            {hospital?.logo_url ? (
              <Image
                source={{ uri: hospital.logo_url }}
                style={styles.hospitalLogo}
              />
            ) : (
              <View style={styles.hospitalIcon}>
                <Building2 size={32} color={PrimaryColors.main} />
              </View>
            )}
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>{hospital?.name || 'Hospital'}</Text>
              <Text style={styles.department}>{session.jobRequirement?.department || 'Department'}</Text>
            </View>
          </View>

          {/* Address */}
          {hospital?.address && (
            <View style={styles.addressRow}>
              <MapPin size={18} color={NeutralColors.textSecondary} />
              <Text style={styles.addressText}>{hospital.address}</Text>
            </View>
          )}

          {/* Distance */}
          {distance !== null && (
            <View style={styles.distanceRow}>
              <Navigation size={18} color={PrimaryColors.main} />
              <Text style={styles.distanceText}>
                {distance < 1 
                  ? `${Math.round(distance * 1000)}m away` 
                  : `${distance.toFixed(2)} km away`}
              </Text>
              {distance > 0.5 && (
                <Text style={styles.distanceWarning}> (Outside range)</Text>
              )}
            </View>
          )}
        </View>

        {/* Map */}
        {hospital?.latitude && hospital?.longitude && (
          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>Location & Directions</Text>
            <MapViewComponent
              initialLocation={{
                latitude: hospital.latitude,
                longitude: hospital.longitude,
              }}
              height={250}
              showCurrentLocationButton={true}
            />
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={openDirections}
            >
              <ExternalLink size={18} color="#fff" />
              <Text style={styles.directionsButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Check-In Status */}
        <View style={styles.statusCard}>
          {isCheckedIn ? (
            <View style={styles.checkedInStatus}>
              <CheckCircle size={32} color={StatusColors.success} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Checked In</Text>
                <Text style={styles.statusTime}>
                  {new Date(session.check_in_time).toLocaleString()}
                </Text>
                {session.check_in_verified ? (
                  <Text style={styles.verifiedText}>✓ Location verified</Text>
                ) : (
                  <Text style={styles.unverifiedText}>⚠ Location not verified</Text>
                )}
              </View>
            </View>
          ) : needsCheckIn ? (
            <View style={styles.pendingStatus}>
              <Clock size={32} color={StatusColors.warning} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Check-In Required</Text>
                <Text style={styles.statusSubtitle}>Please check in to confirm your attendance</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Live Timer - After Check-In (Auto-Running) */}
        {isCheckedIn && !session.end_time && (
          <View style={styles.timerCard}>
            <View style={styles.timerHeader}>
              <Timer size={24} color={isTimerRunning ? StatusColors.success : StatusColors.warning} />
              <Text style={styles.timerTitle}>
                {isTimerRunning ? 'Live Work Timer (Running)' : 'Timer Paused'}
              </Text>
            </View>
            <View style={styles.timerDisplay}>
              <Text style={[styles.timerText, { color: isTimerRunning ? PrimaryColors.main : StatusColors.warning }]}>
                {formatTime(timeElapsed)}
              </Text>
              <Text style={styles.timerLabel}>
                {isTimerRunning ? 'Time Elapsed (Live)' : 'Timer Stopped - Complete session to record'}
              </Text>
            </View>
            {isTimerRunning ? (
              <View style={styles.timerStatusBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.timerStatusText}>Timer is running automatically</Text>
              </View>
            ) : (
              <View style={styles.timerWarningBadge}>
                <Text style={styles.timerWarningText}>
                  ⚠ Timer is paused. Complete the session to record your work time.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Checkout/Complete Button - After Check-In */}
        {isCheckedIn && !session.end_time && (
          <TouchableOpacity
            style={[styles.completeButton, completing && styles.completeButtonDisabled]}
            onPress={handleCompleteSession}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Square size={20} color="#fff" />
                <Text style={styles.completeButtonText}>Complete Work (Checkout)</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Checkout Time Display - After Completion */}
        {session.end_time && (
          <View style={styles.checkoutCard}>
            <View style={styles.checkoutHeader}>
              <CheckCircle size={24} color={StatusColors.success} />
              <Text style={styles.checkoutTitle}>Work Completed</Text>
            </View>
            <View style={styles.checkoutInfo}>
              <Text style={styles.checkoutLabel}>Checkout Time:</Text>
              <Text style={styles.checkoutTime}>
                {new Date(session.end_time).toLocaleString()}
              </Text>
              <Text style={styles.checkoutDuration}>
                Duration: {formatTime(timeElapsed)}
              </Text>
            </View>
          </View>
        )}

        {/* Check-In Button */}
        {needsCheckIn && (
          <TouchableOpacity
            style={[
              styles.checkInButton,
              checkingIn && styles.checkInButtonDisabled
            ]}
            onPress={handleCheckIn}
            disabled={checkingIn || !currentLocation}
          >
            {checkingIn ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.checkInButtonText}>Check In Now</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Session Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Session Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(session.session_date).toLocaleDateString()}
            </Text>
          </View>
          {session.start_time && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>
                {session.start_time} - {session.end_time || 'TBD'}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, { color: StatusColors.info }]}>
              {session.status}
            </Text>
          </View>
        </View>
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
  },
  emptyText: {
    fontSize: 18,
    color: NeutralColors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  hospitalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hospitalLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: 16,
    backgroundColor: PrimaryColors.lightest,
  },
  hospitalIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: PrimaryColors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 20,
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.divider,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginLeft: 8,
    lineHeight: 20,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: PrimaryColors.main,
    marginLeft: 8,
  },
  distanceWarning: {
    fontSize: 14,
    color: StatusColors.warning,
    marginLeft: 4,
  },
  mapContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 12,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  checkedInStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  statusTime: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginBottom: 4,
  },
  verifiedText: {
    fontSize: 13,
    color: StatusColors.success,
    fontWeight: '600',
  },
  unverifiedText: {
    fontSize: 13,
    color: StatusColors.warning,
    fontWeight: '600',
  },
  timerContainer: {
    marginTop: 8,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: StatusColors.warning,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
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
  checkInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.divider,
  },
  detailLabel: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    fontWeight: '600',
  },
  timerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  timerDisplay: {
    alignItems: 'center',
    marginVertical: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: PrimaryColors.main,
    fontFamily: 'monospace',
  },
  timerLabel: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 8,
  },
  timerActions: {
    marginTop: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  playButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: StatusColors.success,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: StatusColors.success,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 8,
    shadowColor: StatusColors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  checkoutCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: StatusColors.success,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  checkoutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: StatusColors.success,
  },
  checkoutInfo: {
    gap: 8,
  },
  checkoutLabel: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    fontWeight: '600',
  },
  checkoutTime: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 8,
  },
  checkoutDuration: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    fontStyle: 'italic',
  },
  timerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)', // StatusColors.success with opacity
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: StatusColors.success,
  },
  timerStatusText: {
    fontSize: 13,
    color: StatusColors.success,
    fontWeight: '600',
  },
  timerWarningBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)', // StatusColors.warning with opacity
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  timerWarningText: {
    fontSize: 13,
    color: StatusColors.warning,
    fontWeight: '600',
    textAlign: 'center',
  },
});

