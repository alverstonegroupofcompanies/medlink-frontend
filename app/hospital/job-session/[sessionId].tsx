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
  Image,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  User,
  MapPin,
  Calendar,
  Timer,
  Building2,
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../../api';
import { ScreenSafeArea } from '@/components/screen-safe-area';

export default function HospitalJobSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadSession();
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [sessionId])
  );

  useEffect(() => {
    if (session?.check_in_time && !session?.end_time) {
      // Calculate elapsed time since check-in
      const checkInTime = new Date(session.check_in_time);
      const updateElapsed = () => {
        const elapsed = Date.now() - checkInTime.getTime();
        setTimeElapsed(elapsed);
      };
      
      updateElapsed(); // Initial calculation
      intervalRef.current = setInterval(updateElapsed, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [session]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/hospital/sessions/${sessionId}`);
      
      if (!response.data.session) {
        Alert.alert('Session Not Found', 'The job session could not be found.');
        router.back();
        return;
      }
      
      setSession(response.data.session);
    } catch (error: any) {
      console.error('Error loading session:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </View>
      </ScreenSafeArea>
    );
  }

  if (!session) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Session not found</Text>
        </View>
      </View>
      </ScreenSafeArea>
    );
  }

  const doctor = session.doctor;
  const requirement = session.job_requirement;
  const isCompleted = session.status === 'completed';
  const isInProgress = session.status === 'in_progress' && session.check_in_time;

  return (
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
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
        {/* Doctor Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={24} color={PrimaryColors.main} />
            <Text style={styles.cardTitle}>Doctor Information</Text>
          </View>
          <View style={styles.doctorInfoRow}>
            {doctor?.profile_photo && (
              <Image
                source={{ uri: doctor.profile_photo }}
                style={styles.doctorImage}
              />
            )}
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>{doctor?.name || 'Doctor'}</Text>
              <Text style={styles.department}>{requirement?.department || 'Department'}</Text>
            </View>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckCircle size={24} color={isCompleted ? StatusColors.success : PrimaryColors.main} />
            <Text style={styles.cardTitle}>Session Status</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: isCompleted ? StatusColors.success : PrimaryColors.main }]}>
              {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Scheduled'}
            </Text>
          </View>
        </View>

        {/* Check-In Information */}
        {session.check_in_time && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Clock size={24} color={StatusColors.success} />
              <Text style={styles.cardTitle}>Check-In Information</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Check-In Time:</Text>
              <Text style={styles.infoValue}>
                {new Date(session.check_in_time).toLocaleString()}
              </Text>
            </View>
            {session.check_in_verified && (
              <View style={styles.verifiedBadge}>
                <CheckCircle size={16} color={StatusColors.success} />
                <Text style={styles.verifiedText}>Location Verified</Text>
              </View>
            )}
          </View>
        )}

        {/* Work Timer (if in progress) */}
        {isInProgress && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Timer size={24} color={PrimaryColors.main} />
              <Text style={styles.cardTitle}>Work Timer</Text>
            </View>
            
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
              <Text style={styles.timerLabel}>Time Elapsed</Text>
            </View>
          </View>
        )}

        {/* Completion Information */}
        {isCompleted && session.end_time && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <CheckCircle size={24} color={StatusColors.success} />
              <Text style={styles.cardTitle}>Completion Information</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completed At:</Text>
              <Text style={styles.infoValue}>
                {new Date(session.end_time).toLocaleString()}
              </Text>
            </View>
            {session.check_in_time && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Work Duration:</Text>
                <Text style={styles.infoValue}>
                  {formatTime(new Date(session.end_time).getTime() - new Date(session.check_in_time).getTime())}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Session Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={24} color={PrimaryColors.accent} />
            <Text style={styles.cardTitle}>Session Details</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>
              {new Date(session.session_date).toLocaleDateString()}
            </Text>
          </View>
          {session.start_time && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Start Time:</Text>
              <Text style={styles.infoValue}>
                {new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          {session.end_time && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>End Time:</Text>
              <Text style={styles.infoValue}>
                {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Building2 size={24} color={PrimaryColors.accent} />
            <Text style={styles.cardTitle}>Payment</Text>
          </View>
          {session.payment_amount && (
            <Text style={styles.paymentAmount}>
              ₹{typeof session.payment_amount === 'number' ? session.payment_amount.toFixed(2) : parseFloat(session.payment_amount || '0').toFixed(2)}
            </Text>
          )}
          <Text style={styles.paymentStatus}>
            Status: {session.payment_status || 'pending'}
          </Text>
        </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
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
  card: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PrimaryColors.dark, // Dark blue background like in image
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  statusBadge: {
    backgroundColor: `${PrimaryColors.main}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: `${StatusColors.success}15`,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 12,
    color: StatusColors.success,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 24,
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
  paymentAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: PrimaryColors.accent,
    marginTop: 8,
    marginBottom: 8,
  },
  paymentStatus: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
});

