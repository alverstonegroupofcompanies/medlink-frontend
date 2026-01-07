import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Star, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react-native';
import { Card, Text, Button, Surface, Avatar, Chip, ActivityIndicator } from 'react-native-paper';
import API from '../../api';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { formatISTDateWithWeekday } from '@/utils/timezone';
import { getFullImageUrl } from '@/utils/url-helper';

export default function ReviewSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  useEffect(() => {
    setRating(0);
    setReview('');
    setSelectedTags([]);
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const response = await API.get(`/hospital/sessions/${sessionId}`);
      setSession(response.data.session);
    } catch (error: any) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please give a star rating before approving.');
      return;
    }

    try {
      setSubmitting(true);
      
      // 1. Rate Doctor (include tags in review)
      const reviewText = selectedTags.length > 0 
        ? `Tags: ${selectedTags.join(', ')}\n\n${review}`.trim()
        : review;

      await API.post('/hospital/rate-doctor', {
        job_session_id: sessionId,
        rating: rating,
        review: reviewText
      });

      // 2. Confirm and Release Payment (integrated)
      await API.post(`/hospital/sessions/${sessionId}/confirm`);

      // 3. Reload session to get updated status
      await loadSession();
      
      Alert.alert('Success', 'Work approved and payment released for admin verification.');
    } catch (error: any) {
      console.error('Approval failed:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to approve session');
    } finally {
      setSubmitting(false);
    }
  };

  // handlePayment is now integrated into handleApprove via backend confirmSession logic.

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
  const payment = session.payments && session.payments.length > 0 ? session.payments[0] : null;
  
  // Check if hospital has already confirmed/approved this session
  const isHospitalApproved = session.hospital_confirmed === true || payment?.hospital_approved_at != null;
  
  // Check if there's already a rating for this session
  const hasExistingRating = session.ratings && session.ratings.length > 0;

  const isPaymentReleased = session.payment_status === 'released';
  const isPaymentCompleted = session.payment_status === 'paid';
  const isWaitingForAdmin = isHospitalApproved && !isPaymentReleased && !isPaymentCompleted;

  const professionalTags = ['Punctual', 'Professional', 'Good Communication', 'Skilled'];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <ScreenSafeArea style={styles.container}>
      <StatusBar style="light" backgroundColor="#0066FF" />
      
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={0}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ratings & Disputes</Text>
          <View style={{ width: 40 }} />
        </View>
      </Surface>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Section Label */}
        <Text style={styles.sectionLabel}>PENDING FEEDBACK</Text>

        {/* Main Feedback Card */}
        <Card style={styles.mainCard} mode="elevated" elevation={2}>
          <Card.Content>
            {/* Shift Header */}
            <View style={styles.shiftHeader}>
              <View style={{flex: 1}}>
                <Text style={styles.shiftType}>COMPLETED SHIFT</Text>
                <Text style={styles.shiftTitle}>{requirement?.department || 'General'} Shift</Text>
                <Text style={styles.shiftDate}>{formatISTDateWithWeekday(session.session_date)} • {session.check_in_time ? new Date(session.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'} - {session.end_time ? new Date(session.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}</Text>
              </View>
              {isHospitalApproved && (
                <View style={styles.paymentHeldBadge}>
                  <CheckCircle size={12} color="#16A34A" />
                  <Text style={styles.paymentHeldText}>Payment Held</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Doctor Info */}
            <View style={styles.doctorSection}>
              {doctor?.profile_photo ? (
                <Avatar.Image 
                  size={48} 
                  source={{ uri: getFullImageUrl(doctor.profile_photo) }} 
                  style={{ backgroundColor: '#EFF6FF' }}
                />
              ) : (
                <Avatar.Text 
                  size={48} 
                  label={doctor?.name?.substring(0,2) || 'Dr'} 
                  style={{ backgroundColor: '#EFF6FF' }} 
                  color="#3B82F6"
                />
              )}
              <View style={{marginLeft: 12, flex: 1}}>
                <Text style={styles.doctorName}>Dr. {doctor?.name || 'Doctor'}</Text>
                <Text style={styles.doctorSpecialty}>{requirement?.department || 'Department'} • {doctor?.experience || '0'} Yrs Exp</Text>
              </View>
            </View>

            {!isHospitalApproved && (
              <>
                <View style={styles.divider} />

                {/* Rating Section */}
                <View style={styles.ratingSection}>
                  <Text style={styles.ratingLabel}>How was your experience?</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Star 
                          size={40} 
                          color={star <= rating ? '#FCD34D' : '#E5E7EB'} 
                          fill={star <= rating ? '#FCD34D' : 'transparent'}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Professional Tags */}
                <View style={styles.tagsSection}>
                  <View style={styles.tagsRow}>
                    {professionalTags.map((tag) => (
                      <TouchableOpacity 
                        key={tag} 
                        onPress={() => toggleTag(tag)}
                        style={[
                          styles.tag,
                          selectedTags.includes(tag) && styles.tagSelected
                        ]}
                      >
                        <Text style={[
                          styles.tagText,
                          selectedTags.includes(tag) && styles.tagTextSelected
                        ]}>{tag}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Review Input */}
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share additional details about the shift..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  value={review}
                  onChangeText={setReview}
                  textAlignVertical="top"
                />

                {/* Submit Button */}
                <Button 
                  mode="contained"
                  onPress={handleApprove}
                  loading={submitting}
                  disabled={submitting || rating === 0}
                  style={styles.submitButton}
                  contentStyle={{height: 56}}
                  labelStyle={styles.submitButtonLabel}
                >
                  Submit Rating & Release Funds
                </Button>
              </>
            )}

            {isHospitalApproved && (
              <View style={styles.approvedSection}>
                <View style={styles.approvedIcon}>
                  <CheckCircle size={48} color="#16A34A" />
                </View>
                <Text style={styles.approvedTitle}>Rating Submitted!</Text>
                <Text style={styles.approvedText}>Payment is being processed and will be released to the doctor shortly.</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Dispute Section */}
        {!isHospitalApproved && (
          <Card style={styles.disputeCard} mode="outlined">
            <Card.Content>
              <View style={styles.disputeHeader}>
                <AlertTriangle size={20} color="#DC2626" />
                <Text style={styles.disputeTitle}>Issue with this shift?</Text>
              </View>
              <Text style={styles.disputeText}>
                If the shift wasn't completed as agreed (e.g., no-show, late arrival), raise a dispute. Payment will remain in escrow until resolved.
              </Text>
              <TouchableOpacity 
                style={styles.disputeButton}
                onPress={() => Alert.alert('Coming Soon', 'Dispute feature will be available soon.')}
              >
                <Text style={styles.disputeButtonText}>Open Dispute Form</Text>
                <ChevronDown size={16} color="#DC2626" />
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        {/* Escrow Badge */}
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
  headerSurface: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 0 : 20, 
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    color: '#0F172A',
  },
  content: {
    padding: 20,
    paddingBottom: 50,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: -8,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shiftType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
    marginBottom: 4,
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
  paymentHeldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentHeldText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  doctorSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#64748B',
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagsSection: {
    marginTop: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  tagSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tagTextSelected: {
    color: '#fff',
  },
  reviewInput: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginTop: 16,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  approvedSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  approvedIcon: {
    marginBottom: 16,
  },
  approvedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 8,
  },
  approvedText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  disputeCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 12,
  },
  disputeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  disputeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  disputeText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 20,
    marginBottom: 12,
  },
  disputeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  disputeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignSelf: 'center',
    marginTop: 8,
  },
  escrowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
