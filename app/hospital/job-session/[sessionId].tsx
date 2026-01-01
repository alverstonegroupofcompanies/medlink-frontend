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
  Platform,
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
import { formatISTDateTime, formatISTDateWithWeekday } from '@/utils/timezone';
import { getFullImageUrl } from '@/utils/url-helper';
import { Card, Surface, Chip, Avatar, Button, Divider } from 'react-native-paper';

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
      // Ensure we parse the date correctly. valid ISO strings usually parse correctly in UTC or local 
      // depending on the string. Safe bet: treat as new Date(str) but if it's from Laravel it might lack 'Z'.
      const checkInTime = new Date(session.check_in_time);
      
      const updateElapsed = () => {
        // Simple elapsed calculation
        const now = new Date();
        const elapsed = now.getTime() - checkInTime.getTime();
        setTimeElapsed(Math.max(0, elapsed));
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
      <ScreenSafeArea backgroundColor={PrimaryColors.dark}>
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
      <ScreenSafeArea backgroundColor={PrimaryColors.dark}>
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
    <ScreenSafeArea backgroundColor={PrimaryColors.dark}>
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
      
      {/* Header - White Surface like Dashboard */}
      <Surface style={styles.headerSurface} elevation={0}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={NeutralColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Session</Text>
          <View style={{ width: 40 }} />
        </View>
      </Surface>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Doctor Info Card */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon size={40} icon="account" style={{ backgroundColor: '#EFF6FF' }} color={PrimaryColors.main} />
              <Text style={styles.cardTitle}>Doctor Information</Text>
            </View>
            <View style={styles.doctorInfoRow}>
              {doctor?.profile_photo ? (
                <Avatar.Image
                  size={60}
                  source={{ 
                    uri: getFullImageUrl(doctor.profile_photo),
                    headers: { 'Cache-Control': 'no-cache' }
                  }}
                  style={{ marginRight: 16 }}
                  onError={(error) => {
                    console.log('❌ Doctor avatar failed to load:', {
                      profile_photo: doctor.profile_photo,
                      full_url: getFullImageUrl(doctor.profile_photo),
                      error
                    });
                  }}
                  onLoad={() => {
                    console.log('✅ Doctor avatar loaded successfully:', getFullImageUrl(doctor.profile_photo));
                  }}
                />
              ) : (
                <Avatar.Text 
                   size={60} 
                   label={doctor?.name?.charAt(0) || 'D'} 
                   style={{ marginRight: 16, backgroundColor: '#EFF6FF' }}
                   color={PrimaryColors.main}
                />
              )}
              <View style={styles.doctorDetails}>
                <Text style={styles.doctorName}>{doctor?.name || 'Doctor'}</Text>
                <Text style={styles.department}>{requirement?.department || 'Department'}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Status Card */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <CheckCircle size={24} color={isCompleted ? StatusColors.success : PrimaryColors.main} />
              <Text style={styles.cardTitle}>Session Status</Text>
            </View>
            <Chip 
              mode="flat" 
              style={{ backgroundColor: isCompleted ? '#DCFCE7' : '#EFF6FF', alignSelf: 'flex-start', marginTop: 8 }}
              textStyle={{ color: isCompleted ? StatusColors.success : PrimaryColors.main, fontWeight: '700' }}
            >
              {isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : 'SCHEDULED'}
            </Chip>
            
            {(isInProgress || session.status === 'scheduled') && (
              <Button 
                mode="contained"
                onPress={() => router.push(`/hospital/live-tracking?sessionId=${session.id}&doctorId=${doctor?.id}`)}
                style={{ marginTop: 16, backgroundColor: PrimaryColors.main }}
                icon={() => <MapPin size={16} color="#fff" />}
              >
                Track Live Location
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Check-In Information */}
        {session.check_in_time && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.cardHeader}>
                <Clock size={24} color={StatusColors.success} />
                <Text style={styles.cardTitle}>Check-In Information</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Check-In Time:</Text>
                <Text style={styles.infoValue}>
                  {formatISTDateTime(session.check_in_time)}
                </Text>
              </View>
              {session.check_in_verified && (
                <Chip icon="check" style={{ backgroundColor: '#DCFCE7', marginTop: 8 }} textStyle={{ color: StatusColors.success }}>
                  Location Verified
                </Chip>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Work Timer (if in progress) */}
        {isInProgress && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.cardHeader}>
                <Timer size={24} color={PrimaryColors.main} />
                <Text style={styles.cardTitle}>Work Timer</Text>
              </View>
              
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
                <Text style={styles.timerLabel}>Time Elapsed</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Completion Information */}
        {isCompleted && session.end_time && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.cardHeader}>
                <CheckCircle size={24} color={StatusColors.success} />
                <Text style={styles.cardTitle}>Completion Information</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Completed At:</Text>
                <Text style={styles.infoValue}>
                  {formatISTDateTime(session.end_time)}
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
            </Card.Content>
          </Card>
        )}

        {/* Session Details */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <Calendar size={24} color={PrimaryColors.main} />
              <Text style={styles.cardTitle}>Session Details</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>
                {formatISTDateWithWeekday(session.session_date)}
              </Text>
            </View>
            {session.start_time && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Time:</Text>
                <Text style={styles.infoValue}>
                  {(() => {
                    try {
                      const timeStr = session.start_time.includes('T') || session.start_time.includes('-') 
                        ? session.start_time 
                        : `2000-01-01 ${session.start_time}`;
                      return new Date(timeStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                    } catch (e) {
                      return session.start_time;
                    }
                  })()}
                </Text>
              </View>
            )}
            {session.schedule_end_time && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Scheduled End Time:</Text>
                <Text style={styles.infoValue}>
                   {(() => {
                    try {
                      const timeStr = session.schedule_end_time.includes('T') || session.schedule_end_time.includes('-') 
                        ? session.schedule_end_time 
                        : `2000-01-01 ${session.schedule_end_time}`;
                      return new Date(timeStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                    } catch (e) {
                      return session.schedule_end_time;
                    }
                  })()}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Payment Info */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <Building2 size={24} color={PrimaryColors.main} />
              <Text style={styles.cardTitle}>Payment</Text>
            </View>
            {session.payment_amount && (
              <Text style={styles.paymentAmount}>
                ₹{typeof session.payment_amount === 'number' ? session.payment_amount.toFixed(2) : parseFloat(session.payment_amount || '0').toFixed(2)}
              </Text>
            )}
            <Chip 
               mode="outlined" 
               style={{ borderColor: session.payment_status === 'paid' ? StatusColors.success : NeutralColors.border }}
               textStyle={{ color: session.payment_status === 'paid' ? StatusColors.success : NeutralColors.textSecondary }}
            >
              Status: {session.payment_status?.toUpperCase() || 'PENDING'}
            </Chip>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerSurface: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 0 : 20, // Adjust for safe area content
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    // No manual shadows needed, Paper Card handles it
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
  trackButton: {
    backgroundColor: PrimaryColors.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 8,
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
  timerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timerText: {
    fontSize: 40,
    fontWeight: '700',
    color: PrimaryColors.main,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timerLabel: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginTop: 4,
  },
  paymentAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: PrimaryColors.main,
    marginTop: 8,
    marginBottom: 8,
  },
});

