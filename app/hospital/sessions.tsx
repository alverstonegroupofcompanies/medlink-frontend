import React, { useState, useEffect } from 'react';
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
} from 'lucide-react-native';
import HospitalSidebar from '@/components/HospitalSidebar';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../api';

export default function HospitalSessionsScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [ratingSessionId, setRatingSessionId] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

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

  const getStatusBadge = (session: any) => {
    if (session.status === 'completed' && session.hospital_confirmed) {
      return { text: 'Approved', color: StatusColors.success };
    } else if (session.status === 'completed') {
      return { text: 'Completed', color: PrimaryColors.main };
    } else if (session.status === 'in_progress') {
      return { text: 'In Progress', color: StatusColors.warning };
    }
    return { text: 'Scheduled', color: NeutralColors.textSecondary };
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
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
      
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
          sessions.map((session) => {
            const statusBadge = getStatusBadge(session);
            const doctor = session.doctor;
            const requirement = session.job_requirement;
            const isCompleted = session.status === 'completed';
            const isApproved = session.hospital_confirmed;
            const hasRating = session.ratings && session.ratings.length > 0;

            return (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() => {
                  router.push(`/hospital/job-session/${session.id}`);
                }}
                activeOpacity={0.7}
              >
                {/* Doctor Info */}
                <View style={styles.sessionHeader}>
                  <View style={styles.doctorInfo}>
                    <User size={24} color={PrimaryColors.main} />
                    <View style={styles.doctorDetails}>
                      <Text style={styles.doctorName}>{doctor?.name || 'Doctor'}</Text>
                      <Text style={styles.department}>{requirement?.department || 'Department'}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusBadge.color}15` }]}>
                    <Text style={[styles.statusText, { color: statusBadge.color }]}>
                      {statusBadge.text}
                    </Text>
                  </View>
                </View>

                {/* Session Details */}
                <View style={styles.sessionDetails}>
                  <View style={styles.detailRow}>
                    <Calendar size={16} color={NeutralColors.textSecondary} />
                    <Text style={styles.detailText}>
                      {new Date(session.session_date).toLocaleDateString()}
                    </Text>
                  </View>
                  {session.check_in_time && (
                    <View style={styles.detailRow}>
                      <Clock size={16} color={NeutralColors.textSecondary} />
                      <Text style={styles.detailText}>
                        Check-in: {new Date(session.check_in_time).toLocaleTimeString()}
                      </Text>
                    </View>
                  )}
                  {session.end_time && (
                    <View style={styles.detailRow}>
                      <CheckCircle size={16} color={StatusColors.success} />
                      <Text style={styles.detailText}>
                        Completed: {new Date(session.end_time).toLocaleTimeString()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <DollarSign size={16} color={PrimaryColors.accent} />
                    <Text style={styles.paymentText}>
                      ₹{typeof session.payment_amount === 'number' ? session.payment_amount.toFixed(2) : parseFloat(session.payment_amount || '0').toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                {isCompleted && !isApproved && (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApproveSession(session.id)}
                      disabled={processingId === session.id}
                    >
                      {processingId === session.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <CheckCircle size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Approve Work</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Rating Section */}
                {isApproved && !hasRating && (
                  <View style={styles.ratingContainer}>
                    {ratingSessionId === session.id ? (
                      <View style={styles.ratingForm}>
                        <Text style={styles.ratingLabel}>Rate Doctor</Text>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                              key={star}
                              onPress={() => setRating(star)}
                              style={styles.starButton}
                            >
                              <Star
                                size={32}
                                color={star <= rating ? '#FFB800' : NeutralColors.border}
                                fill={star <= rating ? '#FFB800' : 'transparent'}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={styles.reviewInput}
                          placeholder="Write a review (optional)"
                          value={review}
                          onChangeText={setReview}
                          multiline
                          numberOfLines={3}
                        />
                        <View style={styles.ratingActions}>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                              setRatingSessionId(null);
                              setRating(0);
                              setReview('');
                            }}
                          >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.submitRatingButton}
                            onPress={() => handleRateDoctor(session.id)}
                            disabled={processingId === session.id}
                          >
                            {processingId === session.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.submitRatingButtonText}>Submit Rating</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => setRatingSessionId(session.id)}
                      >
                        <Star size={18} color={PrimaryColors.main} />
                        <Text style={styles.rateButtonText}>Rate Doctor</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Payment Button */}
                {isApproved && (
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => handlePay(session.id)}
                  >
                    <DollarSign size={18} color="#fff" />
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                )}

                {/* Show Rating if exists */}
                {hasRating && (
                  <View style={styles.ratingDisplay}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          color={star <= (session.ratings[0]?.rating || 0) ? '#FFB800' : NeutralColors.border}
                          fill={star <= (session.ratings[0]?.rating || 0) ? '#FFB800' : 'transparent'}
                        />
                      ))}
                    </View>
                    {session.ratings[0]?.review && (
                      <Text style={styles.reviewText}>{session.ratings[0].review}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  department: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  paymentText: {
    fontSize: 14,
    color: PrimaryColors.accent,
    fontWeight: '600',
  },
  actionsContainer: {
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  approveButton: {
    backgroundColor: StatusColors.success,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  ratingContainer: {
    marginTop: 12,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${PrimaryColors.main}15`,
    gap: 8,
  },
  rateButtonText: {
    color: PrimaryColors.main,
    fontSize: 16,
    fontWeight: '700',
  },
  ratingForm: {
    padding: 16,
    backgroundColor: NeutralColors.background,
    borderRadius: 12,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: NeutralColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: NeutralColors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  ratingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: NeutralColors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: NeutralColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitRatingButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: PrimaryColors.main,
    alignItems: 'center',
  },
  submitRatingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
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
  ratingDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: NeutralColors.background,
    borderRadius: 8,
  },
  reviewText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 8,
  },
});

