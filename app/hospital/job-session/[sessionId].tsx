import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  MapPin,
  Timer,
  Building2,
  ArrowRight,
  User,
  Phone,
  RefreshCw,
  AlertCircle,
  Star
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../../api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { formatISTDateTime, formatISTDateWithWeekday } from '@/utils/timezone';
import { getFullImageUrl } from '@/utils/url-helper';
import { Card, Text, Button, Surface, Avatar, Chip, ActivityIndicator } from 'react-native-paper';

export default function HospitalJobSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [sessionDisputes, setSessionDisputes] = useState<any[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const loadSessionDisputes = async () => {
    try {
      setDisputesLoading(true);
      // Use backend filtering by job_session_id (ensures disputes are session-specific)
      const response = await API.get(`/disputes?job_session_id=${sessionId}`);
      setSessionDisputes(response.data?.disputes || []);
    } catch (error: any) {
      if (__DEV__) {
        console.error(
          '[HospitalJobSession] Failed to load disputes:',
          error.response?.data || error.message || error
        );
      }
    } finally {
      setDisputesLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSession();
      loadSessionDisputes();
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [sessionId])
  );

  useEffect(() => {
    // Use attendance check_in_time (source of truth) or fallback to session.check_in_time
    const checkInTime = session?.attendance?.check_in_time || session?.check_in_time;
    const checkOutTime = session?.attendance?.check_out_time || session?.check_out_time;
    
    if (checkInTime && !checkOutTime) {
      const checkInDate = new Date(checkInTime);
      
      const updateElapsed = () => {
        const now = new Date();
        const elapsed = now.getTime() - checkInDate.getTime();
        setTimeElapsed(Math.max(0, elapsed));
      };
      
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
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
      const sessionData = response.data.session;
      
      // Debug logging for check-in/check-out times
      console.log('=== Session Data Debug ===');
      console.log('Session ID:', sessionData.id);
      console.log('Attendance:', sessionData.attendance);
      console.log('Attendance check_in_time:', sessionData.attendance?.check_in_time);
      console.log('Attendance check_out_time:', sessionData.attendance?.check_out_time);
      console.log('Session check_in_time:', sessionData.check_in_time);
      console.log('Session check_out_time:', sessionData.check_out_time);
      console.log('Session start_time:', sessionData.start_time);
      console.log('Session end_time:', sessionData.end_time);
      console.log('========================');
      
      setSession(sessionData);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PrimaryColors.main} />
      </View>
    );
  }

  if (!session) return null;

  const doctor = session.doctor;
  const requirement = session.job_requirement;
  const isCompleted = session.status === 'completed';
  // Use attendance check_in_time (source of truth) or fallback to session.check_in_time
  const hasCheckedIn = !!(session.attendance?.check_in_time || session.check_in_time);
  const isInProgress = session.status === 'in_progress' && hasCheckedIn;
  const isPaid = session.payment_status === 'paid' || session.payment_status === 'released';
  const paymentHeld = session.payment_status === 'held' || session.payment_status === 'pending';

  // Late is shown ONLY after the scheduled check-in time has passed (session_date + start_time),
  // and only if doctor has not checked in yet.
  const scheduledCheckInDateTime = (() => {
    if (!session?.session_date) return null;
    const dt = new Date(session.session_date);
    const startTime = session?.job_requirement?.start_time;
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
    if (isCompleted || isInProgress) return 0;
    if (!scheduledCheckInDateTime) return 0;
    if (hasCheckedIn) return 0;
    const now = new Date();
    if (now <= scheduledCheckInDateTime) return 0;
    return Math.max(0, Math.floor((now.getTime() - scheduledCheckInDateTime.getTime()) / (1000 * 60)));
  })();

  const isLate = lateMinutes > 0;

  const hasOpenDispute = sessionDisputes.some(
    (d) => d.status !== 'closed' && d.status !== 'resolved'
  );

  const getDisputeStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', label: 'Resolved' };
      case 'closed':
        return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB', label: 'Closed' };
      case 'under_review':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D', label: 'Under Review' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5', label: 'Rejected' };
      case 'open':
      default:
        return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D', label: 'Open' };
    }
  };

  const handleCall = () => {
    if (doctor?.phone_number) {
      Alert.alert(
        'Call Doctor',
        `Call Dr. ${doctor.name} at ${doctor.phone_number}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => {
              // In a real app, use Linking.openURL(`tel:${doctor.phone_number}`)
              Alert.alert('Calling', `Calling ${doctor.phone_number}...`);
            }
          }
        ]
      );
    } else {
      Alert.alert('No Phone Number', 'Doctor phone number not available.');
    }
  };

  const handleReassign = () => {
    Alert.alert(
      'Reassign Shift',
      `Are you sure you want to reassign this shift? Dr. ${doctor?.name} will be removed and you can select a new doctor.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reassign', 
          style: 'destructive',
          onPress: async () => {
            try {
              await API.post(`/hospital/sessions/${sessionId}/reassign`);
              Alert.alert('Success', 'Shift has been reassigned. You can now select a new doctor.');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to reassign shift');
            }
          }
        }
      ]
    );
  };

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.dark} statusBarStyle="light-content" style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Session</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <Text style={styles.sectionLabel}>SESSION STATUS</Text>
        </View>

        {/* Main Session Card */}
        <Card style={[styles.card, styles.mainCard]} mode="elevated" elevation={2}>
          <Card.Content>
            {/* Session Title & Status */}
            <View style={styles.sessionHeader}>
              <View style={{flex: 1}}>
                <View style={styles.sessionTypeRow}>
                  <Text style={styles.sessionType}>
                    {isCompleted ? 'COMPLETED SHIFT' : isInProgress ? 'ONGOING SHIFT' : 'SCHEDULED SHIFT'}
                  </Text>
                  <View style={styles.badgeContainer}>
                    {paymentHeld && (
                      <View style={styles.paymentHeldBadge}>
                        <CheckCircle size={12} color="#16A34A" />
                        <Text style={styles.paymentHeldText}>Payment Held</Text>
                      </View>
                    )}
                    {isLate && (
                      <View style={styles.lateBadge}>
                        <Text style={styles.lateText}>LATE ({lateMinutes}m)</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.shiftTitle}>{requirement?.department || 'General'} Shift</Text>
                <Text style={styles.shiftDate}>{formatISTDateWithWeekday(session.session_date)}</Text>
              </View>
            </View>

            {/* Doctor Info */}
            <View style={styles.doctorSection}>
              <View style={styles.doctorRow}>
                {doctor?.profile_photo ? (
                  <Avatar.Image 
                    size={48} 
                    source={{ uri: getFullImageUrl(doctor.profile_photo) }} 
                    style={{ backgroundColor: '#EFF6FF' }}
                  />
                ) : (
                  <Avatar.Icon 
                    size={48} 
                    icon={() => <User size={24} color="#3B82F6" />}
                    style={{ backgroundColor: '#EFF6FF' }} 
                  />
                )}
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName} numberOfLines={1}>Dr. {doctor?.name || 'Doctor'}</Text>
                  <Text style={styles.doctorSpecialty} numberOfLines={1}>{requirement?.department || 'Department'} • {doctor?.experience || '0'} Yrs Exp</Text>
                </View>
              </View>
            </View>

            {/* Time Log Section - Always show */}
            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>Time Tracking</Text>
              <View style={styles.timeGrid}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeItemLabel}>Check In</Text>
                  <Text style={styles.timeItemValue}>
                    {(() => {
                      // Priority: attendance.check_in_time > session.check_in_time > job_requirement.start_time (scheduled)
                      const checkInTime = session.attendance?.check_in_time || session.check_in_time;
                      if (checkInTime) {
                        return new Date(checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                      }
                      // Show scheduled start time from job requirement if no check-in yet
                      const scheduledStartTime = session.job_requirement?.start_time;
                      if (scheduledStartTime) {
                        try {
                          const [hours, minutes] = scheduledStartTime.split(':');
                          const hour = parseInt(hours);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const displayHour = hour % 12 || 12;
                          return `${displayHour}:${minutes} ${ampm}`;
                        } catch {
                          return scheduledStartTime;
                        }
                      }
                      return '--:--';
                    })()}
                  </Text>
                </View>
                <View style={styles.timeDivider} />
                <View style={styles.timeItem}>
                  <Text style={styles.timeItemLabel}>Check Out</Text>
                  <Text style={styles.timeItemValue}>
                    {(() => {
                      // Priority: attendance.check_out_time > session.check_out_time > job_requirement.end_time (scheduled)
                      const checkOutTime = session.attendance?.check_out_time || session.check_out_time;
                      if (checkOutTime) {
                        return new Date(checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                      }
                      // Show scheduled end time from job requirement only if check-in hasn't happened yet
                      const scheduledEndTime = session.job_requirement?.end_time;
                      if (scheduledEndTime && !session.attendance?.check_in_time && !session.check_in_time) {
                        try {
                          const [hours, minutes] = scheduledEndTime.split(':');
                          const hour = parseInt(hours);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const displayHour = hour % 12 || 12;
                          return `${displayHour}:${minutes} ${ampm}`;
                        } catch {
                          return scheduledEndTime;
                        }
                      }
                      return '--:--';
                    })()}
                  </Text>
                </View>
                <View style={styles.timeDivider} />
                <View style={styles.timeItem}>
                  <Text style={styles.timeItemLabel}>Duration</Text>
                  <Text style={styles.timeItemValue}>
                    {(() => {
                      if (isInProgress) {
                        return formatTime(timeElapsed).substring(0, 5);
                      }
                      // Use attendance times for duration calculation
                      const checkInTime = session.attendance?.check_in_time || session.check_in_time;
                      const checkOutTime = session.attendance?.check_out_time || session.check_out_time;
                      if (checkOutTime && checkInTime) {
                        const duration = new Date(checkOutTime).getTime() - new Date(checkInTime).getTime();
                        return formatTime(duration).substring(0, 5);
                      }
                      return '0h 0m';
                    })()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Late Alert & Actions */}
            {isLate && (
              <View style={styles.lateAlert}>
                <View style={styles.lateAlertHeader}>
                  <AlertCircle size={20} color="#DC2626" />
                  <View style={{flex: 1, marginLeft: 8}}>
                    <Text style={styles.lateAlertTitle}>Issue with this shift?</Text>
                    <Text style={styles.lateAlertText}>
                      If the shift wasn't completed as agreed (e.g., no-show, late arrival), raise a dispute. Payment will remain in escrow until resolved.
                    </Text>
                  </View>
                </View>
                <View style={styles.lateActions}>
                  <Button 
                    mode="outlined"
                    onPress={handleCall}
                    style={styles.callButton}
                    icon={() => <Phone size={16} color="#3B82F6" />}
                    labelStyle={styles.callButtonLabel}
                  >
                    Call
                  </Button>
                  <Button 
                    mode="contained"
                    onPress={handleReassign}
                    style={styles.reassignButton}
                    icon={() => <RefreshCw size={16} color="#fff" />}
                    labelStyle={styles.reassignButtonLabel}
                  >
                    Reassign
                  </Button>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            {isInProgress && (
              <Button 
                mode="contained"
                onPress={() => router.push(`/hospital/live-tracking?sessionId=${session.id}&doctorId=${doctor?.id}`)}
                style={styles.trackButton}
                icon={() => <MapPin size={18} color="#fff" />}
                labelStyle={styles.trackButtonLabel}
              >
                Track Live Location
              </Button>
            )}

            {isCompleted && (
              <>
                <Button 
                  mode="contained"
                  onPress={() => router.push(`/hospital/review-session/${session.id}`)}
                  style={[styles.actionButton, isPaid && styles.actionButtonPaid]}
                  contentStyle={{height: 56}}
                  icon={() => <ArrowRight size={20} color="#fff" />}
                  labelStyle={styles.actionButtonLabel}
                >
                  {isPaid ? 'Payment Released' : 'Submit Rating & Release Funds'}
                </Button>
                {requirement && (
                  <Button 
                    mode="contained"
                    onPress={() => router.push(`/hospital/applications/${requirement.id}`)}
                    style={[styles.actionButton, { marginTop: 12, backgroundColor: '#3B82F6' }]}
                    contentStyle={{height: 48}}
                    icon={() => <Building2 size={18} color="#FFFFFF" />}
                    labelStyle={[styles.actionButtonLabel, { color: '#FFFFFF' }]}
                  >
                    View Job Details
                  </Button>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Payment Summary Card - Hide after payment is released */}
        {!isPaid && (
          <Card style={[styles.card, styles.paymentCard]} mode="outlined">
            <Card.Content>
              <View style={styles.paymentHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <Building2 size={20} color={PrimaryColors.main} />
                  <Text style={styles.paymentTitle}>Payment Summary</Text>
                </View>
              </View>
              
              {/* Payment Breakdown */}
              {(() => {
                const doctorAmount = parseFloat(session.payment_amount || session.payments?.[0]?.doctor_amount || '0');
                const serviceCharge = parseFloat(session.payments?.[0]?.admin_amount || '0') || (doctorAmount * 0.20);
                const totalAmount = parseFloat(session.payments?.[0]?.amount || '0') || (doctorAmount + serviceCharge);
                
                return (
                  <>
                    <View style={styles.paymentBreakdownRow}>
                      <Text style={styles.paymentBreakdownLabel}>Doctor Amount:</Text>
                      <Text style={styles.paymentBreakdownValue}>₹{doctorAmount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.paymentBreakdownRow}>
                      <Text style={styles.paymentBreakdownLabel}>Service Charge (20%):</Text>
                      <Text style={styles.paymentBreakdownValue}>₹{serviceCharge.toFixed(2)}</Text>
                    </View>
                    <View style={styles.paymentDivider} />
                    <View style={styles.paymentTotalRow}>
                      <Text style={styles.paymentTotalLabel}>Total Paid:</Text>
                      <Text style={styles.paymentAmount}>₹{totalAmount.toFixed(2)}</Text>
                    </View>
                  </>
                );
              })()}
              
              <View style={styles.paymentFooter}>
                <Text style={styles.paymentNote}>Doctor receives full amount. Service charge included.</Text>
                <Chip 
                  style={{backgroundColor: isPaid ? StatusColors.successBg : paymentHeld ? PrimaryColors.lightest : NeutralColors.border}} 
                  textStyle={{color: isPaid ? StatusColors.successDark : paymentHeld ? PrimaryColors.dark : NeutralColors.textTertiary, fontWeight: 'bold', fontSize: 11}}
                  icon={isPaid ? 'check' : 'clock'}
                >
                  {isPaid ? 'PAID' : paymentHeld ? 'HELD' : 'PENDING'}
                </Chip>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Reviews Section - Show after completion */}
        {isCompleted && session?.ratings && session.ratings.length > 0 && (
          <Card style={styles.card} mode="elevated" elevation={2}>
            <Card.Content>
              <Text style={styles.reviewSectionTitle}>Reviews</Text>
              {session.ratings.map((rating: any, index: number) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.starRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          color={star <= rating.rating ? '#FCD34D' : '#E5E7EB'}
                          fill={star <= rating.rating ? '#FCD34D' : 'transparent'}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewRatedBy}>
                      Rated by: {rating.rated_by === 'hospital' ? 'Hospital' : 'Doctor'}
                    </Text>
                  </View>
                  {rating.review && (
                    <Text style={styles.reviewText}>{rating.review}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(rating.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Disputes Section */}
        {(disputesLoading || sessionDisputes.length > 0 || !hasOpenDispute) && (
          <Card style={styles.card} mode="elevated" elevation={2}>
            <Card.Content>
              <Text style={styles.disputeSectionTitle}>Disputes</Text>
              {disputesLoading ? (
                <View style={{ paddingVertical: 8 }}>
                  <ActivityIndicator size="small" color={PrimaryColors.main} />
                </View>
              ) : (
                <>
                  {sessionDisputes.length === 0 && (
                    <Text style={styles.disputeEmptyText}>
                      No disputes raised for this session.
                    </Text>
                  )}
                  {sessionDisputes.map((dispute: any) => {
                    const badge = getDisputeStatusBadge(dispute.status);
                    return (
                      <View key={dispute.id} style={styles.disputeItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.disputeItemTitle} numberOfLines={2}>
                            {dispute.title}
                          </Text>
                          <Text style={styles.disputeItemMeta} numberOfLines={1}>
                            Type:{' '}
                            {dispute.dispute_type?.charAt(0).toUpperCase() +
                              dispute.dispute_type?.slice(1)}{' '}
                            •{' '}
                            {new Date(dispute.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.disputeStatusBadge,
                            { backgroundColor: badge.bg, borderColor: badge.border },
                          ]}
                        >
                          <Text style={[styles.disputeStatusText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                        <Button
                          mode="text"
                          compact
                          onPress={() =>
                            router.push(`/hospital/dispute/detail/${dispute.id}`)
                          }
                          labelStyle={styles.disputeViewButtonLabel}
                        >
                          View
                        </Button>
                      </View>
                    );
                  })}
                </>
              )}

              {/* Open Dispute CTA (only if no open dispute and payment not released) */}
              {!isPaid && !hasOpenDispute && (
                <Button
                  mode="outlined"
                  onPress={() => router.push(`/hospital/dispute/${session.id}`)}
                  style={styles.disputeOpenButton}
                  labelStyle={styles.disputeOpenButtonLabel}
                  icon={() => <AlertCircle size={16} color="#DC2626" />}
                >
                  Open Dispute
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Escrow Protection Badge */}
        <View style={styles.escrowBadge}>
          <CheckCircle size={16} color="#16A34A" />
          <Text style={styles.escrowText}>All payments protected by Escrow</Text>
        </View>

      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: PrimaryColors.dark,
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 50,
    gap: 16,
  },
  statusBadgeContainer: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  mainCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sessionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  sessionType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  paymentHeldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: StatusColors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  paymentHeldText: {
    fontSize: 10,
    fontWeight: '700',
    color: StatusColors.success,
  },
  shiftTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  shiftDate: {
    fontSize: 13,
    color: '#64748B',
  },
  doctorSection: {
    paddingTop: 16,
    marginBottom: 20,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorInfo: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  timeSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  timeGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeItemLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  timeItemValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  timeDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  trackButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  trackButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonPaid: {
    backgroundColor: '#16A34A',
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  disputeButton: {
    borderColor: StatusColors.error,
    borderWidth: 1.5,
    marginTop: 8,
  },
  paymentCard: {
    borderColor: PrimaryColors.light,
    backgroundColor: PrimaryColors.lightest,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: PrimaryColors.light,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  paymentBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentBreakdownLabel: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  paymentBreakdownValue: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    fontWeight: '600',
  },
  paymentDivider: {
    height: 1,
    backgroundColor: PrimaryColors.light,
    marginVertical: 12,
  },
  paymentTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentTotalLabel: {
    fontSize: 16,
    color: PrimaryColors.dark,
    fontWeight: '700',
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: PrimaryColors.dark,
    letterSpacing: -1,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PrimaryColors.light,
  },
  paymentNote: {
    fontSize: 12,
    color: PrimaryColors.dark,
    opacity: 0.7,
    flex: 1,
    marginRight: 8,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PrimaryColors.dark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignSelf: 'center',
  },
  escrowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  lateBadge: {
    backgroundColor: StatusColors.errorBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  lateText: {
    fontSize: 10,
    fontWeight: '700',
    color: StatusColors.error,
  },
  lateAlert: {
    backgroundColor: StatusColors.errorBg,
    borderWidth: 1,
    borderColor: StatusColors.errorLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  lateAlertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lateAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: StatusColors.error,
    marginBottom: 4,
  },
  lateAlertText: {
    fontSize: 12,
    color: StatusColors.errorDark,
    lineHeight: 18,
  },
  lateActions: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    borderRadius: 8,
  },
  callButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  reassignButton: {
    flex: 1,
    backgroundColor: StatusColors.error,
    borderRadius: 8,
  },
  reassignButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starRating: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewRatedBy: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  reviewText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  disputeSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PrimaryColors.dark,
    marginBottom: 8,
  },
  disputeEmptyText: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
    marginBottom: 8,
  },
  disputeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  disputeItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
  },
  disputeItemMeta: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginTop: 2,
  },
  disputeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  disputeStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  disputeViewButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  disputeOpenButton: {
    marginTop: 12,
    borderColor: '#DC2626',
  },
  disputeOpenButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});
