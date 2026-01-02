import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ArrowRight, Star, Clock, CheckCircle, User, Check, Building2 } from 'lucide-react-native';
import { Card, Text, Button, Divider, Surface, Avatar, Chip } from 'react-native-paper';
import API from '../../api';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { formatISTDateTime, formatISTDateWithWeekday } from '@/utils/timezone';
import { getFullImageUrl } from '@/utils/url-helper';

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

  const shouldShowReleasePayment = session.hospital_confirmed && session.payment_status !== 'paid' && session.payment_status !== 'released';
  const isPaid = session.payment_status === 'paid' || session.payment_status === 'released';

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
      <Surface style={styles.headerSurface} elevation={0}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={NeutralColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & Pay</Text>
          <View style={{ width: 40 }} />
        </View>
      </Surface>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Doctor Card */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
             <View style={styles.doctorRow}>
                {session.doctor?.profile_photo ? (
                    <Avatar.Image 
                        size={60} 
                        source={{ uri: getFullImageUrl(session.doctor.profile_photo) }} 
                        style={{ backgroundColor: '#F1F5F9' }}
                    />
                ) : (
                    <Avatar.Text 
                        size={60} 
                        label={session.doctor?.name?.substring(0,2) || 'Dr'} 
                        style={{ backgroundColor: '#F1F5F9' }} 
                        color={PrimaryColors.main}
                    />
                )}
                <View style={{marginLeft: 16}}>
                    <Text variant="titleMedium" style={{fontWeight: '700', color: '#0F172A'}}>Dr. {session.doctor?.name}</Text>
                    <Text variant="bodyMedium" style={{color: '#64748B'}}>{session.job_requirement?.department || 'General Department'}</Text>
                </View>
            </View>
          </Card.Content>
        </Card>

        {/* Work Summary */}
        <Card style={styles.card} mode="outlined">
            <Card.Content>
                <View style={styles.cardHeader}>
                    <Clock size={20} color={PrimaryColors.main} />
                    <Text variant="titleMedium" style={{fontWeight: '600', color: '#0F172A'}}>Work Summary</Text>
                </View>
                <Divider style={{marginVertical: 12}} />
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text variant="labelMedium" style={{color: '#64748B'}}>Check In</Text>
                        <Text variant="titleMedium" style={{fontWeight: '700'}}>{checkIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    </View>
                     <View style={[styles.statItem, {borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 20}]}>
                        <Text variant="labelMedium" style={{color: '#64748B'}}>Check Out</Text>
                        <Text variant="titleMedium" style={{fontWeight: '700'}}>{session.check_out_time ? checkOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</Text>
                    </View>
                     <View style={styles.statItem}>
                        <Text variant="labelMedium" style={{color: '#64748B'}}>Duration</Text>
                        <Text variant="titleMedium" style={{fontWeight: '700'}}>{hours}h {minutes}m</Text>
                    </View>
                </View>
            </Card.Content>
        </Card>

        {/* Rating */}
        <Card style={styles.card} mode="outlined">
             <Card.Content>
                <View style={styles.cardHeader}>
                    <Star size={20} color="#F59E0B" fill={ rating > 0 ? "#F59E0B" : "none"} />
                    <Text variant="titleMedium" style={{fontWeight: '600', color: '#0F172A'}}>Doctor Rating</Text>
                </View>
                <View style={[styles.starRow, {marginTop: 16}]}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)} disabled={session.hospital_confirmed}>
                            <Star 
                                size={36} 
                                color={star <= (session.hospital_confirmed ? session.doctor?.average_rating || 5 : rating) ? "#FFB800" : "#E2E8F0"} 
                                fill={star <= (session.hospital_confirmed ? session.doctor?.average_rating || 5 : rating) ? "#FFB800" : "transparent"}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
             </Card.Content>
        </Card>

        {/* Payment Card - BIG TEXT as requested */}
        <Card style={[styles.card, {borderColor: '#FDE68A', backgroundColor: '#FFFBEB'}]} mode="outlined">
             <Card.Content>
                 <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8}}>
                    <Building2 size={20} color="#B45309" />
                    <Text variant="titleMedium" style={{color: '#92400E', fontWeight: 'bold'}}>Total Payment</Text>
                 </View>
                 
                 <Text style={{fontSize: 42, fontWeight: '800', color: '#92400E', marginVertical: 8}}>
                    ₹{session.payment_amount || '0'}
                 </Text>
                 
                 <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text variant="bodySmall" style={{color: '#B45309'}}>Includes platform fees</Text>
                    <Chip 
                        style={{backgroundColor: isPaid ? '#DCFCE7' : '#FEF3C7'}} 
                        textStyle={{color: isPaid ? '#166534' : '#B45309', fontWeight: 'bold'}}
                        icon={isPaid ? 'check' : 'clock'}
                    >
                        {isPaid ? 'PAID' : 'PENDING'}
                    </Chip>
                 </View>
             </Card.Content>
        </Card>

        {/* Action Button (Inline) */}
        <View style={styles.inlineFooter}>
            {!session.hospital_confirmed ? (
                <Button 
                    mode="contained" 
                    onPress={handleApprove}
                    loading={submitting}
                    disabled={submitting || rating === 0}
                    style={{ borderRadius: 12, backgroundColor: PrimaryColors.main }}
                    contentStyle={{ height: 56 }}
                    labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
                >
                    Approve Work
                </Button>
            ) : shouldShowReleasePayment ? (
                <View>
                    <View style={{backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, marginBottom: 16, flexDirection: 'row', gap: 12, alignItems: 'center'}}>
                         <CheckCircle size={24} color="#2563EB" />
                         <View style={{flex: 1}}>
                             <Text style={{color: '#1E40AF', fontWeight: '700', fontSize: 16}}>Work Approved</Text>
                             <Text style={{color: '#1E40AF', fontSize: 13}}>Please release the payment to the doctor.</Text>
                         </View>
                    </View>
                    <Button 
                        mode="contained"
                        onPress={handlePayment}
                        style={{ borderRadius: 12, backgroundColor: '#16A34A' }}
                        contentStyle={{ height: 56 }}
                        labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
                        icon={() => <ArrowRight size={24} color="white" />}
                    >
                        Release Payment Now
                    </Button>
                </View>
            ) : (
                <Surface style={{padding: 20, alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 16}} elevation={1}>
                    <CheckCircle size={48} color="#15803D" />
                    <Text variant="headlineSmall" style={{color: '#15803D', fontWeight: 'bold', marginTop: 12}}>Payment Completed</Text>
                    <Text variant="bodyMedium" style={{color: '#166534', marginTop: 4}}>Transaction ID: #PAY-{session.id}</Text>
                </Surface>
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
  headerSurface: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 0 : 20, 
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
    color: NeutralColors.textPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    // Paper handles shadow
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  inlineFooter: {
    marginTop: 10,
    marginBottom: 20,
  },
});
