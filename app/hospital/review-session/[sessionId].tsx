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
import { ArrowLeft, ArrowRight, Star, Clock, Calendar, CheckCircle, User, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../../api';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';

export default function ReviewSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
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

      // 2. Confirm Only (Payment will be separate)
      await API.post(`/hospital/sessions/${sessionId}/confirm`);

      Alert.alert('Success', 'Work approved successfully! Please proceed to payment release.');
      loadSession(); // Reload to show payment button
    } catch (error: any) {
      console.error('Approval failed:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to approve session');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
      setShowPaymentModal(true);
      setProcessingPayment(true);

      // Simulate bank processing delay for "dummy payment"
      setTimeout(async () => {
          try {
              // Call backend to release payment
              await API.post(`/hospital/sessions/${sessionId}/release-payment`);
              
              setProcessingPayment(false);
              setTimeout(() => {
                  setShowPaymentModal(false);
                  Alert.alert('Payment Successful', 'Payment has been released to the doctor.');
                  loadSession();
              }, 500);
          } catch (error: any) {
              setProcessingPayment(false);
              setShowPaymentModal(false);
              Alert.alert('Payment Failed', error.response?.data?.message || 'Failed to release payment');
          }
      }, 2000); // 2 second dummy delay
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
    <ScreenSafeArea style={styles.container}>
      <StatusBar style="dark" backgroundColor="#fff" />
      
      {/* Payment Processing Modal */}
      {showPaymentModal && (
        <View style={StyleSheet.absoluteFillObject}>
             <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 9999}}>
                <View style={{backgroundColor: 'white', padding: 30, borderRadius: 24, alignItems: 'center', width: '80%', elevation: 10}}>
                     {processingPayment ? (
                         <>
                            <ActivityIndicator size="large" color="#16A34A" />
                            <Text style={{marginTop: 20, fontSize: 18, fontWeight: '700', color: '#0F172A'}}>Processing Payment...</Text>
                            <Text style={{marginTop: 8, color: '#64748B', textAlign: 'center'}}>Releasing funds safely via Escrow...</Text>
                         </>
                     ) : (
                         <>
                            <View style={{width: 60, height: 60, borderRadius: 30, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 20}}>
                                <Check size={32} color="#16A34A" />
                            </View>
                            <Text style={{fontSize: 20, fontWeight: '700', color: '#16A34A'}}>Payment Sent!</Text>
                         </>
                     )}
                </View>
            </View>
        </View>
      )}
      
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

        {/* Action Button (Inline) */}
        <View style={styles.inlineFooter}>
            {!session.hospital_confirmed ? (
                <TouchableOpacity 
                    style={[styles.payBtn, (submitting || rating === 0) && styles.disabledBtn]} 
                    onPress={handleApprove}
                    disabled={submitting || rating === 0}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.payBtnText}>Approve (Verified Work)</Text>
                            <CheckCircle size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            ) : session.payment_status !== 'paid' ? (
                <View>
                    <View style={{backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', gap: 12, alignItems: 'center'}}>
                         <CheckCircle size={20} color="#2563EB" />
                         <View>
                             <Text style={{color: '#1E40AF', fontWeight: '700'}}>Work Approved</Text>
                             <Text style={{color: '#1E40AF', fontSize: 12}}>Payment pending release</Text>
                         </View>
                    </View>
                    <TouchableOpacity 
                        style={[styles.payBtn, { backgroundColor: '#16A34A' }]}
                        onPress={handlePayment}
                    >
                        <Text style={styles.payBtnText}>Release Payment Now</Text>
                        <ArrowRight size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={[styles.payBtn, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.payBtnText, { color: '#15803D' }]}>Payment Completed</Text>
                    <Check size={24} color="#15803D" />
                </View>
            )}
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
      paddingBottom: 50, // Extra padding for scrolling
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
      backgroundColor: '#FEF3C7', 
      borderRadius: 16,
      padding: 20,
      marginBottom: 30, // More space before button
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
  inlineFooter: {
      marginBottom: 20,
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
