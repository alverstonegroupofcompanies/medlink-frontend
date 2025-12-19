import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  Clock,
  CheckCircle,
  Building2,
  MapPin,
  Phone,
  DollarSign,
  Square,
  Navigation,
  ArrowLeft,
} from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors, DoctorStatusColors as StatusColors } from '@/constants/doctor-theme';
import API from '@/app/api';
import { formatISTDateTime } from '@/utils/timezone';

// Conditionally import MapView only on native
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}

export default function JobSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [completing, setCompleting] = useState(false);

  const DURATION_HOURS = 2;
  const DURATION_MS = DURATION_HOURS * 60 * 60 * 1000;

  useFocusEffect(
    React.useCallback(() => {
      loadSession();
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [sessionId])
  );

  useEffect(() => {
    if (session?.check_in_time && !session?.end_time) {
      const checkInTime = new Date(session.check_in_time);
      setStartTime(checkInTime);
      setIsRunning(true);
      const elapsed = Date.now() - checkInTime.getTime();
      setTimeElapsed(Math.min(elapsed, DURATION_MS));
    } else if (session?.end_time) {
      setIsRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [session]);

  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime.getTime();
        if (elapsed >= DURATION_MS) {
          handleCompleteSession();
        } else {
          setTimeElapsed(elapsed);
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, startTime]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/doctor/sessions/${sessionId}`);
      if (!response.data.session) {
        Alert.alert('Session Not Found', 'The job session could not be found.');
        router.back();
        return;
      }
      setSession(response.data.session);
      if (response.data.session?.check_in_time && !response.data.session?.end_time) {
        const checkInTime = new Date(response.data.session.check_in_time);
        setStartTime(checkInTime);
        setIsRunning(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load session', [
        { text: 'Go Back', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    if (completing) return;
    Alert.alert('Complete Work', 'Are you sure you want to complete this work session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            setCompleting(true);
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            await API.post(`/doctor/sessions/${sessionId}/complete`);
            Alert.alert('Work Completed! ✓', 'Your work has been completed.', [
              { text: 'OK', onPress: () => loadSession() },
            ]);
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to complete session');
            setIsRunning(true);
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    const remaining = DURATION_MS - timeElapsed;
    return remaining > 0 ? remaining : 0;
  };

  const getProgress = () => {
    return Math.min((timeElapsed / DURATION_MS) * 100, 100);
  };

  const openDirections = () => {
    const hospital = session?.job_requirement?.hospital;
    const lat = hospital?.latitude ? parseFloat(hospital.latitude) : null;
    const lng = hospital?.longitude ? parseFloat(hospital.longitude) : null;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Session not found</Text>
        </View>
      </View>
    );
  }

  const hospital = session.job_requirement?.hospital;
  const requirement = session.job_requirement;
  const isCompleted = session.status === 'completed';
  const isInProgress = session.status === 'in_progress' && session.check_in_time;
  const hospitalLat = hospital?.latitude ? parseFloat(hospital.latitude) : null;
  const hospitalLng = hospital?.longitude ? parseFloat(hospital.longitude) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Session</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Map Section - ONLY ONCE and ONLY ON NATIVE */}
        {Platform.OS !== 'web' && hospitalLat && hospitalLng && MapView && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: hospitalLat,
                longitude: hospitalLng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{ latitude: hospitalLat, longitude: hospitalLng }}
                title={hospital?.name}
              >
                <View style={styles.hospitalMarker}>
                  <Text style={styles.hospitalMarkerIcon}>🏥</Text>
                </View>
              </Marker>
            </MapView>
            <TouchableOpacity style={styles.directionsButton} onPress={openDirections}>
              <Navigation size={18} color={PrimaryColors.main} />
              <Text style={styles.directionsText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ALL INFO IN ONE CARD - No Repetition */}
        <View style={styles.mainCard}>
          {/* Hospital Info */}
          <View style={styles.hospitalSection}>
            <View style={styles.iconHeader}>
              <Building2 size={24} color={PrimaryColors.main} />
              <Text style={styles.hospitalName}>{hospital?.name || 'Hospital'}</Text>
            </View>
            <Text style={styles.department}>{requirement?.department || 'Department'}</Text>
            
            {hospital?.address && (
              <View style={styles.infoRow}>
                <MapPin size={16} color={NeutralColors.textSecondary} />
                <Text style={styles.infoText}>{hospital.address}</Text>
              </View>
            )}
            {hospital?.phone_number && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(`tel:${hospital.phone_number}`)}
              >
                <Phone size={16} color={PrimaryColors.main} />
                <Text style={[styles.infoText, { color: PrimaryColors.main }]}>{hospital.phone_number}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Status & Time Info */}
          <View style={styles.statusSection}>
            <View style={styles.statusRow}>
              <CheckCircle size={20} color={isCompleted ? StatusColors.success : PrimaryColors.main} />
              <Text style={[styles.statusText, { color: isCompleted ? StatusColors.success : PrimaryColors.main }]}>
                {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Scheduled'}
              </Text>
            </View>

            {session.check_in_time && (
              <Text style={styles.timestampText}>
                Checked in: {formatISTDateTime(session.check_in_time)}
              </Text>
            )}
            {session.end_time && (
              <Text style={styles.timestampText}>
                Completed: {formatISTDateTime(session.end_time)}
              </Text>
            )}
          </View>

          {/* Timer - Only When In Progress */}
          {isInProgress && !isCompleted && (
            <>
              <View style={styles.divider} />
              <View style={styles.timerSection}>
                <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
                <Text style={styles.timerLabel}>Time Worked</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
                </View>
                <Text style={styles.remainingText}>{formatTime(getRemainingTime())} remaining</Text>
                <TouchableOpacity
                  style={[styles.completeButton, completing && styles.buttonDisabled]}
                  onPress={handleCompleteSession}
                  disabled={completing}
                >
                  {completing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Square size={20} color="#fff" />
                      <Text style={styles.buttonText}>Complete Work</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Payment Info */}
          {session.payment_amount && (
            <>
              <View style={styles.divider} />
              <View style={styles.paymentSection}>
                <View style={styles.iconHeader}>
                  <DollarSign size={22} color={PrimaryColors.accent} />
                  <Text style={styles.sectionTitle}>Payment</Text>
                </View>
                <Text style={styles.paymentAmount}>₹{parseFloat(session.payment_amount || '0').toFixed(2)}</Text>
                <Text style={[styles.statusText, { color: session.payment_status_new === 'paid' ? StatusColors.success : StatusColors.warning }]}>
                  {session.payment_status_new === 'paid' ? 'Paid' : 'Pending Payment'}
                </Text>
              </View>
            </>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  header: {
    backgroundColor: PrimaryColors.dark,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  hospitalMarker: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  hospitalMarkerIcon: {
    fontSize: 22,
  },
  directionsButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  mainCard: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  hospitalSection: {
    marginBottom: 4,
  },
  iconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    flex: 1,
  },
  department: {
    fontSize: 16,
    color: NeutralColors.textSecondary,
    marginBottom: 12,
    marginLeft: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    marginLeft: 32,
  },
  infoText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: NeutralColors.border,
    marginVertical: 16,
  },
  statusSection: {
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestampText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 4,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 4,
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
    marginTop: 4,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: NeutralColors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: PrimaryColors.main,
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginBottom: 16,
  },
  completeButton: {
    backgroundColor: StatusColors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  paymentSection: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: PrimaryColors.accent,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 30,
  },
});
