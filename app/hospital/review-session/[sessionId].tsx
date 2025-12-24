import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ArrowRight, Star, Clock, Calendar, CheckCircle, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../../api';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';

export default function ReviewSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  useEffect(() => {
    setRating(0); // Reset rating for new session
    setReview(''); //  useEffect(() => {
    setRating(0); // Reset rating for new session
    setReview(''); // Reset review
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      console.log('Loading session:', sessionId);
      const response = await API.get(`/hospital/sessions/${sessionId}`);
      console.log('Session loaded:', response.data.session.id);
      setSession(response.data.session);
    } catch (error: any) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };
// ... (lines 46-123 skipped)


  const handleApprove = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please give a star rating before approving.');
      return;
    }

    try {
      setSubmitting(true);
      
      // 1. Rate Doctor
      await API.post('/hospital/rate-doctor', {
        job_session_id: sessionId,
        rating: rating,
        review: review
      });

      // 2. Confirm & Release Payment
      await API.post(`/hospital/sessions/${sessionId}/confirm`);

      Alert.alert('Success', 'Session approved and payment released!', [
        { text: 'OK', onPress: () => router.replace('/hospital/dashboard') }
      ]);
    } catch (error: any) {
      console.error('Approval failed:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to approve session');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PrimaryColors.main} />
      </View>
    );
  }

  if (!session) return null;

  // Calculate Duration Display
  const checkIn = new Date(session.check_in_time);
  const checkOut = session.check_out_time ? new Date(session.check_out_time) : new Date();
  
  const durationMs = checkOut.getTime() - checkIn.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#0F172A" />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Review & Pay</Text>
         <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Doctor Card */}
        <View style={styles.card}>
            <View style={styles.doctorRow}>
                {session.doctor?.profile_photo ? (
                    <Image source={{ uri: session.doctor.profile_photo }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, {backgroundColor: '#F1F5F9', alignItems:'center', justifyContent:'center'}]}>
                        <User size={24} color="#64748B" />
                    </View>
                )}
                <View>
                    <Text style={styles.doctorName}>Dr. {session.doctor?.name}</Text>
                    <Text style={styles.dept}>{session.job_requirement?.department || 'General Department'}</Text>
                </View>
            </View>
        </View>

        {/* Work Summary */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Summary & Doctor Rating</Text>
            <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Check In</Text>
                    <Text style={styles.statValue}>{checkIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </View>
                 <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Check Out</Text>
                    <Text style={styles.statValue}>{session.check_out_time ? checkOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</Text>
                </View>
                 <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Avg Rating</Text>
                    <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center'}}>
                        <Star size={14} color="#F59E0B" fill="#F59E0B" style={{marginRight: 4}} />
                        <Text style={styles.statValue}>{session.doctor?.average_rating || 'N/A'}</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* Rating */}
        <View style={styles.section}>
             <Text style={styles.sectionTitle}>Rate Performance</Text>
             <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Star 
                            size={32} 
                            color={star <= rating ? "#FFB800" : "#CBD5E1"} 
                            fill={star <= rating ? "#FFB800" : "transparent"}
                        />
                    </TouchableOpacity>
                ))}
             </View>
             <Text style={styles.ratingHint}>{rating > 0 ? `${rating} Stars` : 'Tap to rate'}</Text>
        </View>

        {/* Payment */}
        <View style={styles.paymentCard}>
             <View style={styles.paymentRow}>
                 <Text style={styles.payLabel}>Total Payment</Text>
                 <Text style={styles.payValue}>₹{session.payment_amount || '0'}</Text>
             </View>
             <Text style={styles.payNote}>Includes platform fees and taxes</Text>
        </View>

      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.payBtn, (submitting || rating === 0) && styles.disabledBtn]} 
            onPress={handleApprove}
            disabled={submitting || rating === 0}
          >
              {submitting ? (
                  <ActivityIndicator color="#fff" />
              ) : (
                  <>
                    <Text style={styles.payBtnText}>Approve & Release Payment</Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
              )}
          </TouchableOpacity>
      </View>
    </View>
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
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 20,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
  },
  backBtn: {
      padding: 4,
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#0F172A',
  },
  scrollContent: {
      padding: 20,
  },
  card: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
  },
  doctorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#F1F5F9',
  },
  doctorName: {
      fontSize: 16,
      fontWeight: '700',
      color: '#0F172A',
  },
  dept: {
      fontSize: 14,
      color: '#64748B',
  },
  section: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 16,
  },
  statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: '#F8FAFC',
      padding: 16,
      borderRadius: 12,
  },
  statItem: {
      alignItems: 'center',
  },
  statLabel: {
      fontSize: 12,
      color: '#64748B',
      marginBottom: 4,
  },
  statValue: {
      fontSize: 14,
      fontWeight: '700',
      color: '#0F172A',
  },
  starRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 8,
  },
  ratingHint: {
      textAlign: 'center',
      color: '#94A3B8',
      fontSize: 14,
  },
  paymentCard: {
      backgroundColor: '#FEF3C7', // Light yellow
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#FDE68A',
  },
  paymentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
  },
  payLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#92400E',
  },
  payValue: {
      fontSize: 24,
      fontWeight: '700',
      color: '#92400E',
  },
  payNote: {
      fontSize: 12,
      color: '#B45309',
  },
  footer: {
      padding: 20,
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
  },
  payBtn: {
      backgroundColor: '#16A34A',
      height: 56,
      borderRadius: 28,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      shadowColor: '#16A34A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
  },
  disabledBtn: {
      backgroundColor: '#94A3B8',
      shadowOpacity: 0,
      elevation: 0,
  },
  payBtnText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
  },
});
