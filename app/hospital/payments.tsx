import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, Image, StatusBar, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, CreditCard, Calendar, User, DollarSign, CheckCircle, Clock, AlertCircle, Building2, FileText, MapPin, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import API from '../api';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import { BASE_BACKEND_URL } from '@/config/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'held' | 'released'>('all');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const safeBottomPadding = useSafeBottomPadding();
  const insets = useSafeAreaInsets();

  const loadPayments = async () => {
    try {
      const [paymentsResponse, walletResponse] = await Promise.all([
        API.get('/hospital/payments'),
        API.get('/hospital/wallet/balance').catch(() => ({ data: { wallet: { balance: 0 } } })) // Fallback if route doesn't exist
      ]);
      const paymentsData = paymentsResponse.data.payments || [];
      const wallet = walletResponse.data?.wallet || { balance: 0 };
      const balance = typeof wallet.balance === 'number' ? wallet.balance : 0;
      setWalletBalance(balance);
      
      // Debug: Log payment data structure to understand what we're receiving
      if (__DEV__) {
        console.log('📊 Total payments loaded:', paymentsData.length);
        if (paymentsData.length > 0) {
          const firstPayment = paymentsData[0];
          console.log('📊 First payment full data:', JSON.stringify(firstPayment, null, 2));
          console.log('👨‍⚕️ First payment doctor:', firstPayment?.doctor);
          console.log('   - doctor?.id:', firstPayment?.doctor?.id);
          console.log('   - doctor?.name:', firstPayment?.doctor?.name);
          console.log('📋 First payment job_session:', firstPayment?.job_session);
          console.log('   - job_session?.doctor_id:', firstPayment?.job_session?.doctor_id);
          console.log('   - job_session?.doctor:', firstPayment?.job_session?.doctor);
          console.log('   - job_session?.doctor?.id:', firstPayment?.job_session?.doctor?.id);
          console.log('   - job_session?.doctor?.name:', firstPayment?.job_session?.doctor?.name);
          console.log('🔑 First payment doctor_id:', firstPayment?.doctor_id);
          
          // Log all payments doctor data
          paymentsData.forEach((payment: any, idx: number) => {
            console.log(`💳 Payment #${idx + 1} (ID: ${payment.id}):`);
            console.log(`   - doctor_id: ${payment.doctor_id}`);
            console.log(`   - doctor:`, payment.doctor);
            console.log(`   - job_session?.doctor_id: ${payment.job_session?.doctor_id}`);
            console.log(`   - job_session?.doctor:`, payment.job_session?.doctor);
          });
        } else {
          console.log('⚠️ No payments found in response');
        }
      }
      
      // CRITICAL: Deduplicate by payment_id to ensure each payment appears only once
      // The backend now deduplicates by payment_id, but we add an extra layer here for safety
      // Group by payment_id (primary key) to ensure uniqueness
      const groupedPayments = new Map<number, any>();
      const statusPriority: { [key: string]: number } = {
        'paid': 4,
        'released': 3,
        'held': 2,
        'in_escrow': 2,
        'pending': 1,
        'failed': 0,
        'refunded': 0,
      };
      
      paymentsData.forEach((payment: any) => {
        // Use payment.id as the unique key (primary key)
        // Each payment should appear only once regardless of status changes
        const paymentId = payment.id;
        
        if (!paymentId) {
          // Edge case: payment without id, skip it
          if (__DEV__) {
            console.warn('⚠️ Payment without id found, skipping:', payment);
          }
          return;
        }
        
        if (!groupedPayments.has(paymentId)) {
          // First time seeing this payment_id, add it
          groupedPayments.set(paymentId, payment);
        } else {
          // Payment with this id already exists - this shouldn't happen if backend is working correctly
          // But handle it by keeping the one with higher priority status or more recent date
          const existing = groupedPayments.get(paymentId);
          const existingStatus = (existing.status || existing.payment_status || '').toLowerCase();
          const newStatus = (payment.status || payment.payment_status || '').toLowerCase();
          
          const existingPriority = statusPriority[existingStatus] || 0;
          const newPriority = statusPriority[newStatus] || 0;
          
          // Keep the payment with higher priority status
          if (newPriority > existingPriority) {
            groupedPayments.set(paymentId, payment);
          } else if (newPriority === existingPriority) {
            // If same priority, keep the one with more recent date
            const existingDate = existing.released_at || existing.paid_at || existing.updated_at || existing.created_at;
            const newDate = payment.released_at || payment.paid_at || payment.updated_at || payment.created_at;
            if (newDate > existingDate) {
              groupedPayments.set(paymentId, payment);
            }
          }
          // If existing has higher priority, keep it (do nothing)
        }
      });
      
      // Convert map to array - show all payments (held, pending, released) for hospitals
      const uniquePayments = Array.from(groupedPayments.values())
        .sort((a, b) => {
          const dateA = new Date(a.released_at || a.created_at || 0).getTime();
          const dateB = new Date(b.released_at || b.created_at || 0).getTime();
          return dateB - dateA;
        });
      
      if (__DEV__) {
        console.log(`📊 Deduplicated ${paymentsData.length} payments into ${uniquePayments.length} unique payments (by payment_id)`);
        uniquePayments.forEach((p, idx) => {
          if (idx < 5) {
            const dept = p.job_requirement?.department || p.job_session?.job_requirement?.department || 'N/A';
            console.log(`Payment ${idx + 1}: ID=${p.id}, Status=${p.status || p.payment_status}, Amount=${p.amount}, Dept=${dept}, Session=${p.job_session?.id}`);
          }
        });
      }
      
      setPayments(uniquePayments);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading payments:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Ensure status bar is always blue
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#2563EB', true);
        StatusBar.setTranslucent(false);
      }
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'released':
      case 'paid': return '#16A34A'; // Green
      case 'held':
      case 'in_escrow':
      case 'pending': return '#F59E0B'; // Amber
      case 'failed': return '#DC2626'; // Red
      case 'refunded': return '#DC2626'; // Red
      default: return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    // Normalize status - check both status and payment_status fields
    const normalizedStatus = (status || '').toLowerCase();
    
    switch (normalizedStatus) {
      case 'released':
      case 'paid': return 'Completed';
      case 'held':
      case 'in_escrow': return 'Processing';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      case 'refunded': return 'Refunded';
      default: return status ? status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'released':
      case 'paid': return <CheckCircle size={16} color="#16A34A" />;
      case 'held':
      case 'in_escrow':
      case 'pending': return <Clock size={16} color="#F59E0B" />;
      case 'failed': return <AlertCircle size={16} color="#DC2626" />;
      case 'refunded': return <AlertCircle size={16} color="#DC2626" />;
      default: return <AlertCircle size={16} color="#64748B" />;
    }
  };

  const filteredPayments = payments.filter((payment) => {
    if (filter === 'all') return true;
    if (filter === 'held') {
      return payment.status === 'held' || payment.status === 'in_escrow' || payment.status === 'pending';
    }
    if (filter === 'released') {
      return payment.status === 'released' || payment.status === 'paid';
    }
    return true;
  });

  const stats = {
    total: payments.length,
    held: payments.filter(p => p.status === 'held' || p.status === 'in_escrow' || p.status === 'pending').length,
    released: payments.filter(p => p.status === 'released' || p.status === 'paid').length,
    totalAmount: payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
  };

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpand = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Helper function to get doctor name
  const getDoctorName = (item: any) => {
    const jobSession = item.job_session;
    const doctor = item.doctor;
    
    // Priority 1: Get name from jobSession.doctor
    if (jobSession?.doctor?.name) {
      return jobSession.doctor.name;
    }
    
    // Priority 2: Get name from direct payment.doctor relationship
    if (doctor?.name) {
      return doctor.name;
    }
    
    // Priority 3: Fallback to doctor ID if name not available
    if (jobSession?.doctor?.id) {
      return `Doctor ID: ${jobSession.doctor.id}`;
    }
    
    if (doctor?.id) {
      return `Doctor ID: ${doctor.id}`;
    }
    
    if (jobSession?.doctor_id) {
      return `Doctor ID: ${jobSession.doctor_id}`;
    }
    
    if (item.doctor_id) {
      return `Doctor ID: ${item.doctor_id}`;
    }
    
    return null;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    // Get status from either status or payment_status field
    const paymentStatus = item.status || item.payment_status || 'pending';
    const isHeld = paymentStatus === 'held' || paymentStatus === 'in_escrow' || paymentStatus === 'pending';
    const isReleased = paymentStatus === 'released' || paymentStatus === 'paid';
    const jobSession = item.job_session;
    const jobRequirement = item.job_requirement;
    const isExpanded = expandedItems.has(item.id);
    const hasDetails = jobSession || jobRequirement;
    const doctorName = getDoctorName(item);
    const department = jobRequirement?.department || jobSession?.job_requirement?.department;
    
    // Debug logging for render
    if (__DEV__ && index === 0) {
      console.log('🎨 Rendering payment item:', item.id);
      console.log('   - doctorName result:', doctorName);
      console.log('   - item.doctor:', item.doctor);
      console.log('   - item.job_session:', item.job_session);
      console.log('   - item.job_session?.doctor:', item.job_session?.doctor);
      console.log('   - item.job_session?.doctor?.name:', item.job_session?.doctor?.name);
    }
    
    // Get payment description - show department
    const getPaymentDescription = () => {
      if (department) {
        return `Payment for ${department}`;
      }
      return 'Payment Released';
    };

    return (
      <View key={item.id}>
        <TouchableOpacity
          style={styles.transactionRow}
          onPress={() => hasDetails && toggleExpand(item.id)}
          activeOpacity={hasDetails ? 0.7 : 1}
        >
          <View style={styles.transactionLeft}>
            <View style={styles.transactionDateColumn}>
              <Text style={styles.transactionDateDay}>
                {item.created_at ? new Date(item.created_at).getDate() : '--'}
              </Text>
              <Text style={styles.transactionDateMonth}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase() : '---'}
              </Text>
            </View>
            <View style={styles.transactionInfoColumn}>
              <Text style={styles.transactionDescription} numberOfLines={1}>
                {getPaymentDescription()}
              </Text>
              {doctorName ? (
                <Text style={styles.transactionDoctor} numberOfLines={1}>
                  {doctorName}
                </Text>
              ) : null}
              {department && !doctorName && (
                <Text style={styles.transactionDoctor} numberOfLines={1}>
                  {department}
                </Text>
              )}
              <View style={styles.transactionStatusRow}>
                <View style={[styles.transactionStatusDot, { 
                  backgroundColor: isReleased ? '#16A34A' : isHeld ? '#F59E0B' : '#9CA3AF' 
                }]} />
                <Text style={[styles.transactionStatusText, { 
                  color: isReleased ? '#16A34A' : isHeld ? '#F59E0B' : '#6B7280' 
                }]}>
                  {getStatusLabel(paymentStatus)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.transactionRight}>
            <Text
              style={[
                styles.transactionAmount,
                {
                  color: isReleased ? '#16A34A' : '#1F2937',
                },
              ]}
            >
              -₹{parseFloat(item.amount || 0).toFixed(2)}
            </Text>
            {hasDetails && (
              <ChevronDown 
                size={18} 
                color="#9CA3AF" 
                style={[styles.expandIcon, isExpanded && { transform: [{ rotate: '180deg' }] }]}
              />
            )}
          </View>
        </TouchableOpacity>
        
        {isExpanded && hasDetails && (
          <View style={styles.transactionDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date & Time:</Text>
              <Text style={styles.detailValue}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }) : 'N/A'}
              </Text>
            </View>
            {doctorName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Doctor:</Text>
                <Text style={styles.detailValue}>{doctorName.replace('Doctor ID: ', '')}</Text>
              </View>
            )}
            {department && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Department:</Text>
                <Text style={styles.detailValue}>{department}</Text>
              </View>
            )}
            {jobSession?.session_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Job Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(jobSession.session_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            )}
            {/* Payment Breakdown */}
            {item.doctor_amount && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Doctor Amount:</Text>
                  <Text style={styles.detailValue}>₹{parseFloat(item.doctor_amount || 0).toFixed(2)}</Text>
                </View>
                {item.admin_amount && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service Charge:</Text>
                    <Text style={styles.detailValue}>₹{parseFloat(item.admin_amount || 0).toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { fontWeight: '700' }]}>Total Paid:</Text>
                  <Text style={[styles.detailValue, { fontWeight: '700' }]}>₹{parseFloat(item.amount || 0).toFixed(2)}</Text>
                </View>
              </>
            )}
            {item.payment_method && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>
                  {item.payment_method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Text>
              </View>
            )}
            {item.released_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Released At:</Text>
                <Text style={styles.detailValue}>
                  {new Date(item.released_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {index < filteredPayments.length - 1 && (
          <View style={styles.transactionDivider} />
        )}
      </View>
    );
  };

  // Hospitals don't see released payments - they're only visible to admin

  return (
    <ScreenSafeArea style={styles.container} backgroundColor="#2563EB" statusBarStyle="light-content">
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} />
      
      {/* Header with Blue Background */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Payments</Text>
            <Text style={styles.headerSubtitle}>Manage your payment history</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: safeBottomPadding + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PrimaryColors.main} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Dashboard Cards - Combined Card */}
          <View style={styles.dashboardContainer}>
            <View style={styles.dashboardRow}>
              <View style={styles.dashboardCardPrimaryFull}>
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dashboardGradient}
                >
                  <View style={styles.dashboardCardHeader}>
                    <View style={styles.dashboardIconCircle}>
                      <MaterialIcons name="account-balance-wallet" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.dashboardCardHeaderText}>
                      <Text style={styles.dashboardCardTitle}>Payment Summary</Text>
                      <Text style={styles.dashboardCardSubtitle}>Total, Held & Released</Text>
                    </View>
                  </View>
                  
                  {/* Three Column Layout */}
                  <View style={styles.paymentSummaryRow}>
                    {/* Total Paid */}
                    <View style={styles.paymentSummaryCol}>
                      <Text style={styles.paymentSummaryLabel}>Total Paid</Text>
                      <Text
                        style={styles.paymentSummaryAmount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        ₹{stats.totalAmount.toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.paymentSummaryDivider} />

                    {/* Wallet Balance */}
                    <View style={styles.paymentSummaryCol}>
                      <Text style={styles.paymentSummaryLabel}>Wallet</Text>
                      <Text
                        style={styles.paymentSummaryAmount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        ₹{(walletBalance ?? 0).toFixed(2)}
                      </Text>
                      <Text style={styles.paymentSummaryHint}>Available balance</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Payment History Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment History</Text>
            </View>

            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              {(['all', 'held', 'released'] as const).map((filterType) => (
                <TouchableOpacity
                  key={filterType}
                  style={[styles.filterButton, filter === filterType && styles.filterButtonActive]}
                  onPress={() => setFilter(filterType)}
                >
                  <Text style={[styles.filterButtonText, filter === filterType && styles.filterButtonTextActive]}>
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payments List */}
            {filteredPayments.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="receipt-long" size={64} color="#e0e0e0" />
                <Text style={styles.emptyText}>No payments found</Text>
                <Text style={styles.emptySubtext}>
                  {filter === 'all' 
                    ? 'You haven\'t made any payments yet'
                    : `No ${filter} payments at the moment`}
                </Text>
              </View>
            ) : (
              <View style={styles.transactionsSection}>
                {filteredPayments.map((item, index) => renderItem({ item, index }))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#2563EB',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '400',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  transactionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  // Dashboard Cards - Similar to Wallet
  dashboardContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dashboardCardPrimary: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  dashboardCardSecondary: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  dashboardCardTertiary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  dashboardGradient: {
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  dashboardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dashboardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  dashboardCardHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  dashboardCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 4,
    lineHeight: 20,
  },
  dashboardCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  dashboardCardAmount: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 14,
    marginTop: 4,
  },
  dashboardCardAmountSmall: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginTop: 8,
  },
  dashboardCardPrimaryFull: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  paymentSummaryCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  paymentSummaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 1,
    marginVertical: 4,
  },
  paymentSummaryLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  paymentSummaryAmount: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  paymentSummaryHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  dashboardCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dashboardIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dashboardCardBody: {
    flex: 1,
  },
  dashboardCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  dashboardCardValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
    lineHeight: 24,
  },

  // Filter Container
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: PrimaryColors.main,
    borderColor: PrimaryColors.main,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },

  // Transaction Style - Matching Wallet
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    marginRight: 12,
  },
  transactionDateColumn: {
    width: 50,
    alignItems: 'center',
    marginRight: 16,
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  transactionDateDay: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 24,
  },
  transactionDateMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  transactionInfoColumn: {
    flex: 1,
    minWidth: 0,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 20,
  },
  transactionDoctor: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  transactionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  transactionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transactionStatusText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  stagesIndicator: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  },
  stagesText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
    letterSpacing: 0.2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    flexShrink: 0,
    minWidth: 100,
  },
  expandIcon: {
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'right',
    lineHeight: 22,
  },
  transactionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 66,
  },
  transactionDetails: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 66,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 18,
  },
  detailValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#374151',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
});
