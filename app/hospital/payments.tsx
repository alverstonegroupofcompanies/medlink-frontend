import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CreditCard, Calendar, User, DollarSign, CheckCircle, Clock, AlertCircle, Building2, FileText, MapPin, TrendingUp, TrendingDown } from 'lucide-react-native';
import API from '../api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import { BASE_BACKEND_URL } from '@/config/api';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'held' | 'released'>('all');

  const loadPayments = async () => {
    try {
      const response = await API.get('/hospital/payments');
      setPayments(response.data.payments || []);
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

  const renderItem = ({ item }: { item: any }) => {
    const isHeld = item.status === 'held' || item.status === 'in_escrow' || item.status === 'pending';
    const isReleased = item.status === 'released' || item.status === 'paid';
    const doctor = item.doctor;
    const jobSession = item.job_session;
    const jobRequirement = item.job_requirement;

    return (
      <View style={styles.paymentCard}>
        {/* Header with Doctor Info */}
        <View style={styles.cardHeader}>
          <View style={styles.doctorInfo}>
            {doctor?.profile_photo ? (
              <Image
                source={{ uri: doctor.profile_photo.startsWith('http') ? doctor.profile_photo : `${BASE_BACKEND_URL}/app/${doctor.profile_photo}` }}
                style={styles.doctorAvatar}
                onError={() => {}}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={20} color={PrimaryColors.main} />
              </View>
            )}
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>Dr. {doctor?.name || 'Unknown Doctor'}</Text>
              {jobRequirement?.department && (
                <Text style={styles.department}>{jobRequirement.department}</Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Payment Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Payment Amount</Text>
          <Text style={styles.amountValue}>₹{parseFloat(item.amount || 0).toFixed(2)}</Text>
        </View>

        {/* Payment Details Grid */}
        <View style={styles.detailsGrid}>
          {item.created_at && (
            <View style={styles.detailItem}>
              <Calendar size={14} color="#64748B" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Payment Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}

          {jobSession?.session_date && (
            <View style={styles.detailItem}>
              <Clock size={14} color="#64748B" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Job Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(jobSession.session_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}

          {item.payment_method && (
            <View style={styles.detailItem}>
              <CreditCard size={14} color="#64748B" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>
                  {item.payment_method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Text>
              </View>
            </View>
          )}

          {jobSession?.id && (
            <View style={styles.detailItem}>
              <FileText size={14} color="#64748B" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Session ID</Text>
                <Text style={styles.detailValue}>#{jobSession.id}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Approval Status */}
        {(isHeld || isReleased) && (
          <View style={styles.approvalSection}>
            <Text style={styles.approvalTitle}>Approval Status</Text>
            <View style={styles.approvalTimeline}>
              <View style={styles.approvalStep}>
                <View style={[styles.approvalDot, item.hospital_approved_at ? styles.approvalDotActive : styles.approvalDotPending]} />
                <View style={styles.approvalStepContent}>
                  <Text style={styles.approvalStepLabel}>Hospital Approval</Text>
                  {item.hospital_approved_at ? (
                    <Text style={styles.approvalStepTime}>
                      {new Date(item.hospital_approved_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : (
                    <Text style={styles.approvalStepPending}>Pending</Text>
                  )}
                </View>
              </View>

              <View style={styles.approvalStep}>
                <View style={[styles.approvalDot, item.admin_approved_at ? styles.approvalDotActive : styles.approvalDotPending]} />
                <View style={styles.approvalStepContent}>
                  <Text style={styles.approvalStepLabel}>Admin Approval</Text>
                  {item.admin_approved_at ? (
                    <Text style={styles.approvalStepTime}>
                      {new Date(item.admin_approved_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : (
                    <Text style={styles.approvalStepPending}>Waiting</Text>
                  )}
                </View>
              </View>

              {item.released_at && (
                <View style={styles.approvalStep}>
                  <View style={[styles.approvalDot, styles.approvalDotReleased]} />
                  <View style={styles.approvalStepContent}>
                    <Text style={styles.approvalStepLabel}>Released</Text>
                    <Text style={styles.approvalStepTime}>
                      {new Date(item.released_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Payment Breakdown */}
        {(item.admin_amount || item.doctor_amount) && (
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Doctor Payment (80%)</Text>
              <Text style={styles.breakdownValue}>₹{parseFloat(item.doctor_amount || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform Fee (20%)</Text>
              <Text style={styles.breakdownValue}>₹{parseFloat(item.admin_amount || 0).toFixed(2)}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenSafeArea style={styles.container} backgroundColor="#F8FAFC">
      <StatusBar style="dark" />
      
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
          contentContainerStyle={styles.scrollContent}
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
            filteredPayments.map((item) => (
              <View key={item.id}>
                {renderItem({ item })}
              </View>
            ))
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

  // Payment Card
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  department: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Amount Section
  amountSection: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: PrimaryColors.main,
    letterSpacing: -0.5,
  },

  // Details Grid
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },

  // Approval Section
  approvalSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  approvalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  approvalTimeline: {
    gap: 12,
  },
  approvalStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  approvalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  approvalDotActive: {
    backgroundColor: '#16A34A',
  },
  approvalDotPending: {
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  approvalDotReleased: {
    backgroundColor: '#2563EB',
  },
  approvalStepContent: {
    flex: 1,
  },
  approvalStepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  approvalStepTime: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
  },
  approvalStepPending: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Breakdown Section
  breakdownSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
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
