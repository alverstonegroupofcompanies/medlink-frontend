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
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  Clock,
  CheckCircle,
  Building2,
  MapPin,
  Phone,
  DollarSign,
  Play,
  Square,
  Timer,
} from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors, DoctorStatusColors as StatusColors } from '@/constants/doctor-theme';
import API from '@/app/api';

export default function JobSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [completing, setCompleting] = useState(false);

  const DURATION_HOURS = 2; // 2 hours
  const DURATION_MS = DURATION_HOURS * 60 * 60 * 1000;

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
      // Start timer if checked in but not completed
      const checkInTime = new Date(session.check_in_time);
      setStartTime(checkInTime);
      setIsRunning(true);
      
      // Calculate elapsed time
      const elapsed = Date.now() - checkInTime.getTime();
      setTimeElapsed(Math.min(elapsed, DURATION_MS));
    } else if (session?.end_time) {
      // Session completed
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [session]);

  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime.getTime();
        if (elapsed >= DURATION_MS) {
          // Timer reached 2 hours - auto complete
          handleCompleteSession();
        } else {
          setTimeElapsed(elapsed);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, startTime]);

  const loadSession = async () => {
    try {
      setLoading(true);
      console.log('Loading session:', sessionId);
      const response = await API.get(`/doctor/sessions/${sessionId}`);
      
      if (!response.data.session) {
        Alert.alert('Session Not Found', 'The job session could not be found. Please check your active jobs.');
        router.back();
        return;
      }
      
      setSession(response.data.session);
      
      // If session is checked in, start timer
      if (response.data.session?.check_in_time && !response.data.session?.end_time) {
        const checkInTime = new Date(response.data.session.check_in_time);
        setStartTime(checkInTime);
        setIsRunning(true);
      }
    } catch (error: any) {
      console.error('Error loading session:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load session';
      Alert.alert('Error', errorMessage, [
        {
          text: 'Go Back',
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    if (completing) return;

    Alert.alert(
      'Complete Work',
      'Are you sure you want to complete this work session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setCompleting(true);
              setIsRunning(false);
              
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }

              const response = await API.post(`/doctor/sessions/${sessionId}/complete`);
              
              Alert.alert(
                'Work Completed! ✓',
                'Your work has been completed. The hospital will be notified and can now approve and rate your work.',
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
              setIsRunning(true); // Resume timer if error
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading session...</Text>
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

  const hospital = session.job_requirement?.hospital;
  const requirement = session.job_requirement;
  const isCompleted = session.status === 'completed';
  const isInProgress = session.status === 'in_progress' && session.check_in_time;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Session</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Hospital Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Building2 size={24} color={PrimaryColors.main} />
            <Text style={styles.cardTitle}>Hospital Information</Text>
          </View>
          <Text style={styles.hospitalName}>{hospital?.name || 'Hospital'}</Text>
          <Text style={styles.department}>{requirement?.department || 'Department'}</Text>
          {hospital?.address && (
            <View style={styles.infoRow}>
              <MapPin size={16} color={NeutralColors.textSecondary} />
              <Text style={styles.infoText}>{hospital.address}</Text>
            </View>
          )}
          {hospital?.phone_number && (
            <View style={styles.infoRow}>
              <Phone size={16} color={NeutralColors.textSecondary} />
              <Text style={styles.infoText}>{hospital.phone_number}</Text>
            </View>
          )}
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
          {session.check_in_time && (
            <View style={styles.infoRow}>
              <Clock size={16} color={NeutralColors.textSecondary} />
              <Text style={styles.infoText}>
                Checked in: {new Date(session.check_in_time).toLocaleString()}
              </Text>
            </View>
          )}
          {session.end_time && (
            <View style={styles.infoRow}>
              <CheckCircle size={16} color={StatusColors.success} />
              <Text style={styles.infoText}>
                Completed: {new Date(session.end_time).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Timer Card */}
        {isInProgress && !isCompleted && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Timer size={24} color={PrimaryColors.main} />
              <Text style={styles.cardTitle}>Work Timer</Text>
            </View>
            
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
              <Text style={styles.timerLabel}>Elapsed Time</Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${getProgress()}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {formatTime(getRemainingTime())} remaining
            </Text>

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
                  <Text style={styles.completeButtonText}>Complete Work</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Info - Just a button for now */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <DollarSign size={24} color={PrimaryColors.accent} />
            <Text style={styles.cardTitle}>Payment</Text>
          </View>
          {session.payment_amount && (
            <Text style={styles.paymentAmount}>
              ₹{typeof session.payment_amount === 'number' ? session.payment_amount.toFixed(2) : parseFloat(session.payment_amount || '0').toFixed(2)}
            </Text>
          )}
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => {
              Alert.alert('Payment', 'Payment functionality will be implemented soon.');
            }}
          >
            <DollarSign size={18} color="#fff" />
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
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
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 60,
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
  hospitalName: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  department: {
    fontSize: 16,
    color: NeutralColors.textSecondary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: `${PrimaryColors.main}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
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
  progressBarContainer: {
    height: 8,
    backgroundColor: NeutralColors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: PrimaryColors.main,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
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
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: PrimaryColors.accent,
    marginTop: 8,
    marginBottom: 16,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: PrimaryColors.accent,
    gap: 8,
    marginTop: 12,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

