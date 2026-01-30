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
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  CheckCircle,
  Star,
  DollarSign,
  Clock,
  User,
  Calendar,
  Building2,
  Menu,
  MapPin,
} from 'lucide-react-native';
import HospitalSidebar from '@/components/HospitalSidebar';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../api';
import { formatISTDateOnly } from '@/utils/timezone';

// Memoized Session Item Component
const SessionItem = React.memo(({ session, onRate, onPay, onReview, ratingSessionId, setRatingSessionId, rating, setRating, review, setReview, processingId }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const statusBadge = (() => {
    if (session.status === 'completed' && session.hospital_confirmed) {
      return { text: 'Approved', color: StatusColors.success };
    } else if (session.status === 'completed') {
      return { text: 'Completed', color: PrimaryColors.main };
    } else if (session.status === 'in_progress') {
      return { text: 'In Progress', color: StatusColors.warning };
    }
    return { text: 'Scheduled', color: NeutralColors.textSecondary };
  })();

  const doctor = session.doctor;
  const requirement = session.job_requirement;
  const isCompleted = session.status === 'completed';
  const isApproved = session.hospital_confirmed;
  const hasRating = session.ratings && session.ratings.length > 0;

  // Calculate "late by" time if check-in is not done
  const hasCheckedIn = !!(session.attendance?.check_in_time || session.check_in_time);
  const scheduledCheckInDateTime = (() => {
    if (!session?.session_date) return null;
    const dt = new Date(session.session_date);
    const startTime = requirement?.start_time;
    if (startTime) {
      const [hh, mm] = String(startTime).split(':');
      const hours = parseInt(hh, 10);
      const minutes = parseInt(mm, 10);
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        dt.setHours(hours, minutes, 0, 0);
      }
    }
    return dt;
  })();

  const lateMinutes = (() => {
    if (hasCheckedIn) return 0; // Already checked in, not late
    if (!scheduledCheckInDateTime) return 0; // No scheduled time
    const now = new Date();
    if (now <= scheduledCheckInDateTime) return 0; // Not yet time
    return Math.max(0, Math.floor((now.getTime() - scheduledCheckInDateTime.getTime()) / (1000 * 60)));
  })();

  const formatLateTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hr${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hr${hours !== 1 ? 's' : ''} ${remainingMinutes} min${remainingMinutes !== 1 ? 's' : ''}`;
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start(() => {
      router.push(`/hospital/job-session/${session.id}`);
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.sessionCard,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.deptBadge}>
              <Building2 size={14} color={PrimaryColors.main} />
              <Text style={styles.deptText}>{requirement?.department || 'Department'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusBadge.color}15`, borderColor: statusBadge.color }]}>
              <View style={[styles.statusDot, { backgroundColor: statusBadge.color }]} />
              <Text style={[styles.statusText, { color: statusBadge.color }]}>
                {statusBadge.text}
              </Text>
            </View>
          </View>
        </View>

        {/* Compact Info Row */}
        <View style={styles.compactInfoRow}>
          <View style={styles.compactInfoItem}>
            <User size={14} color={NeutralColors.textSecondary} />
            <Text style={styles.compactInfoText}>Dr. {doctor?.name || 'Doctor'}</Text>
          </View>
          {session.check_in_time && (
            <View style={styles.compactInfoItem}>
              <Clock size={14} color={NeutralColors.textSecondary} />
              <Text style={styles.compactInfoText}>
                {new Date(session.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </View>
          )}
        </View>

        {/* Date - Inline */}
        <View style={styles.compactDateRow}>
          <Calendar size={13} color={NeutralColors.textSecondary} />
          <Text style={styles.compactDateText}>
            {new Date(session.session_date).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short',
              year: 'numeric'
            })}
            {session.end_time && ` • Completed: ${new Date(session.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
          </Text>
        </View>


        {/* Session Status - Compact */}
        <View style={styles.compactStatusBar}>
          <View style={styles.compactStatusStats}>
            {isCompleted && !isApproved && (
              <View style={styles.compactStatItem}>
                <View style={[styles.compactStatDot, { backgroundColor: StatusColors.warning }]} />
                <Text style={styles.compactStatText}>Review</Text>
              </View>
            )}
            {isApproved && !hasRating && (
              <View style={styles.compactStatItem}>
                <View style={[styles.compactStatDot, { backgroundColor: StatusColors.success }]} />
                <Text style={styles.compactStatText}>Approved</Text>
              </View>
            )}
            {hasRating && (
              <View style={styles.compactRatingDisplay}>
                <Star size={12} color="#FFB800" fill="#FFB800" />
                <Text style={styles.compactRatingValue}>{session.ratings[0]?.rating || 0}/5</Text>
              </View>
            )}
            {lateMinutes > 0 && !hasCheckedIn && (
              <View style={[styles.compactStatItem, { backgroundColor: '#FEE2E215', borderColor: StatusColors.error, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }]}>
                <Clock size={10} color={StatusColors.error} />
                <Text style={[styles.compactStatText, { color: StatusColors.error, fontWeight: '600' }]}>
                  Late by {formatLateTime(lateMinutes)}
                </Text>
              </View>
            )}
            {session.payment_amount && (
              <View style={styles.compactPaymentBadge}>
                <Text style={styles.compactPaymentBadgeText}>
                  ₹{typeof session.payment_amount === 'number' ? session.payment_amount.toFixed(0) : parseFloat(session.payment_amount || '0').toFixed(0)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}, (prev, next) => {
  const prevCheckIn = prev.session.attendance?.check_in_time || prev.session.check_in_time;
  const nextCheckIn = next.session.attendance?.check_in_time || next.session.check_in_time;
  return (
    prev.session.id === next.session.id &&
    prev.session.status === next.session.status &&
    prev.session.hospital_confirmed === next.session.hospital_confirmed &&
    prev.ratingSessionId === next.ratingSessionId &&
    prev.processingId === next.processingId &&
    prevCheckIn === nextCheckIn
  );
});

export default function HospitalSessionsScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [ratingSessionId, setRatingSessionId] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

  // Ensure status bar stays blue always
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#2563EB', true);
        StatusBar.setTranslucent(false);
        StatusBar.setBarStyle('light-content', true);
      }
      StatusBar.setBarStyle('light-content', true);
      return () => {};
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      loadSessions();
    }, [])
  );

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await API.get('/hospital/sessions');
      setSessions(response.data.sessions || []);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSession = async (sessionId: number) => {
    Alert.alert(
      'Approve Work',
      'Are you sure you want to approve this completed work?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessingId(sessionId);
              const response = await API.post(`/hospital/sessions/${sessionId}/confirm`);
              Alert.alert('Success', 'Work approved successfully!');
              loadSessions();
            } catch (error: any) {
              console.error('Error approving session:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to approve session');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleRateDoctor = async (sessionId: number) => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      setProcessingId(sessionId);
      await API.post('/hospital/rate-doctor', {
        job_session_id: sessionId,
        rating: rating,
        review: review || null,
      });
      Alert.alert('Success', 'Doctor rated successfully!');
      setRatingSessionId(null);
      setRating(0);
      setReview('');
      loadSessions();
    } catch (error: any) {
      console.error('Error rating doctor:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to rate doctor');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePay = async (sessionId: number) => {
    Alert.alert(
      'Payment',
      'Payment functionality will be implemented soon. This will process the payment for the completed work.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor={PrimaryColors.dark}>
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.dark} statusBarStyle="light-content">
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => setShowSidebar(true)}
          style={styles.menuButton}
        >
          <Menu size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Sessions</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={NeutralColors.textTertiary} />
            <Text style={styles.emptyText}>No sessions yet</Text>
            <Text style={styles.emptySubtext}>Sessions will appear here when doctors are assigned</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              onRate={handleRateDoctor}
              onPay={handlePay}
              onReview={() => router.push(`/hospital/review-session/${session.id}`)}
              ratingSessionId={ratingSessionId}
              setRatingSessionId={setRatingSessionId}
              rating={rating}
              setRating={setRating}
              review={review}
              setReview={setReview}
              processingId={processingId}
            />
          ))
        )}
      </ScrollView>
      
      {/* Sidebar Menu */}
      <HospitalSidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />
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
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  header: {
    backgroundColor: PrimaryColors.dark,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: NeutralColors.border,
    minHeight: 140,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  deptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${PrimaryColors.main}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deptText: {
    fontSize: 13,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  compactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compactInfoText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  compactDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  compactDateText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  compactLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  compactLocationText: {
    fontSize: 12,
    color: PrimaryColors.accent,
    fontWeight: '600',
    flex: 1,
  },
  compactStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.border,
  },
  compactStatusStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  compactStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactStatText: {
    fontSize: 11,
    color: NeutralColors.textPrimary,
    fontWeight: '600',
  },
  compactRatingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  compactRatingValue: {
    fontSize: 11,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
  },
  viewButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: PrimaryColors.main,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: StatusColors.success,
    gap: 10,
    shadowColor: StatusColors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    gap: 10,
    borderWidth: 2,
    borderColor: PrimaryColors.main,
  },
  secondaryButtonText: {
    color: PrimaryColors.main,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ratingForm: {
    padding: 20,
    backgroundColor: NeutralColors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PrimaryColors.main,
    borderStyle: 'dashed',
  },
  ratingFormTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  starButton: {
    padding: 4,
  },
  reviewInput: {
    borderWidth: 1.5,
    borderColor: NeutralColors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: NeutralColors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    fontFamily: 'System',
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: NeutralColors.background,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: NeutralColors.border,
  },
  cancelBtnText: {
    color: NeutralColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: PrimaryColors.main,
    alignItems: 'center',
    shadowColor: PrimaryColors.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ratingDisplayCard: {
    padding: 18,
    backgroundColor: `${PrimaryColors.main}08`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${PrimaryColors.main}20`,
  },
  ratingDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ratingDisplayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  reviewDisplayText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

