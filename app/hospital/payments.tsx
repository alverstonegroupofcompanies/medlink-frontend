import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, Image, StatusBar, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, CreditCard, Calendar, User, DollarSign, CheckCircle, Clock, AlertCircle, Building2, FileText, MapPin, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react-native';
import API from '../api';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import { BASE_BACKEND_URL } from '@/config/api';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'held' | 'released'>('all');
  const safeBottomPadding = useSafeBottomPadding();

  const loadPayments = async () => {
    try {
      const response = await API.get('/hospital/payments');
      const paymentsData = response.data.payments || [];
      
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
      
      setPayments(paymentsData);
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
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#0066FF', true);
        StatusBar.setBarStyle('light-content', true);
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
    switch (status) {
      case 'released':
      case 'paid': return 'Released';
      case 'held':
      case 'in_escrow': return 'Held';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      case 'refunded': return 'Refunded';
      default: return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
    heldAmount: payments.filter(p => p.status === 'held' || p.status === 'in_escrow' || p.status === 'pending')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
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
  const getDoctorId = (item: any) => {
    const jobSession = item.job_session;
    const doctor = item.doctor;
    
    // Debug logging
    if (__DEV__) {
      console.log('🔍 getDoctorId - Payment ID:', item.id);
      console.log('   - item.doctor_id:', item.doctor_id);
      console.log('   - item.doctor:', doctor);
      console.log('   - item.job_session:', jobSession);
      console.log('   - jobSession?.doctor_id:', jobSession?.doctor_id);
      console.log('   - jobSession?.doctor:', jobSession?.doctor);
    }
    
    // Priority 1: Get ID from jobSession.doctor
    if (jobSession?.doctor?.id) {
      if (__DEV__) console.log('   ✅ Found doctor ID from jobSession.doctor.id:', jobSession.doctor.id);
      return `Doctor ID: ${jobSession.doctor.id}`;
    }
    
    // Priority 2: Get ID from direct payment.doctor relationship
    if (doctor?.id) {
      if (__DEV__) console.log('   ✅ Found doctor ID from doctor.id:', doctor.id);
      return `Doctor ID: ${doctor.id}`;
    }
    
    // Priority 3: Fallback to doctor_id fields
    if (jobSession?.doctor_id) {
      if (__DEV__) console.log('   ✅ Found doctor ID from jobSession.doctor_id:', jobSession.doctor_id);
      return `Doctor ID: ${jobSession.doctor_id}`;
    }
    
    if (item.doctor_id) {
      if (__DEV__) console.log('   ✅ Found doctor ID from item.doctor_id:', item.doctor_id);
      return `Doctor ID: ${item.doctor_id}`;
    }
    
    if (__DEV__) console.log('   ❌ No doctor ID found for payment:', item.id);
    return null;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isHeld = item.status === 'held' || item.status === 'in_escrow' || item.status === 'pending';
    const isReleased = item.status === 'released' || item.status === 'paid';
    const jobSession = item.job_session;
    const jobRequirement = item.job_requirement;
    const isExpanded = expandedItems.has(item.id);
    const hasDetails = jobSession || jobRequirement;
    const doctorId = getDoctorId(item);
    const department = jobRequirement?.department || jobSession?.job_requirement?.department;
    
    // Debug logging for render
    if (__DEV__ && index === 0) {
      console.log('🎨 Rendering payment item:', item.id);
      console.log('   - doctorId result:', doctorId);
      console.log('   - item.doctor:', item.doctor);
      console.log('   - item.job_session:', item.job_session);
      console.log('   - item.job_session?.doctor:', item.job_session?.doctor);
    }
    
    // Get payment description
    const getPaymentDescription = () => {
      if (department) {
        return `Payment for ${department}`;
      }
      if (jobSession?.session_date) {
        return `Payment for job session`;
      }
      return 'Payment';
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
              {(() => {
                if (__DEV__ && index === 0) {
                  console.log('📝 Rendering doctor ID section for payment:', item.id);
                  console.log('   - doctorId value:', doctorId);
                  console.log('   - doctorId type:', typeof doctorId);
                  console.log('   - Will render?', !!doctorId);
                }
                return doctorId ? (
                  <Text style={styles.transactionDoctor} numberOfLines={1}>
                    {doctorId}
                  </Text>
                ) : null;
              })()}
              {department && !doctorId && (
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
                  {getStatusLabel(item.status)}
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
            {doctorId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Doctor ID:</Text>
                <Text style={styles.detailValue}>{doctorId.replace('Doctor ID: ', '')}</Text>
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

  return (
    <ScreenSafeArea style={styles.container} backgroundColor="#F8FAFC" statusBarStyle="light-content">
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottomPadding + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#EFF6FF' }]}>
                <DollarSign size={20} color={PrimaryColors.main} />
              </View>
              <Text style={styles.statValue}>₹{stats.totalAmount.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Paid</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Clock size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>₹{stats.heldAmount.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Held</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <CheckCircle size={20} color="#16A34A" />
              </View>
              <Text style={styles.statValue}>{stats.released}</Text>
              <Text style={styles.statLabel}>Released</Text>
            </View>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            {(['all', 'held', 'released'] as const).map((filterType) => (
              <TouchableOpacity
                key={filterType}
                style={[styles.filterButton, filter === filterType && styles.filterButtonActive]}
                onPress={() => setFilter(filterType)}
              >
                <Text style={[styles.filterText, filter === filterType && styles.filterTextActive]}>
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Text>
                {filterType !== 'all' && (
                  <View style={[styles.filterBadge, filter === filterType && styles.filterBadgeActive]}>
                    <Text style={[styles.filterBadgeText, filter === filterType && styles.filterBadgeTextActive]}>
                      {filterType === 'held' ? stats.held : stats.released}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Payments List */}
          {filteredPayments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CreditCard size={64} color="#CBD5E1" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  transactionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // Filter Container
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: PrimaryColors.main,
    borderColor: PrimaryColors.main,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Bank Transaction Style
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
  },
  transactionDoctor: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  transactionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transactionStatusText: {
    fontSize: 12,
    fontWeight: '500',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  // Empty State
  emptyContainer: {
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
