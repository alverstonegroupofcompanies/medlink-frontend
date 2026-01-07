import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CreditCard, Calendar, User, DollarSign, CheckCircle, Clock, AlertCircle, Building2, FileText, MapPin, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react-native';
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

  const renderItem = ({ item }: { item: any }) => {
    const isHeld = item.status === 'held' || item.status === 'in_escrow' || item.status === 'pending';
    const isReleased = item.status === 'released' || item.status === 'paid';
    const doctor = item.doctor;
    const jobSession = item.job_session;
    const jobRequirement = item.job_requirement;
    const isExpanded = expandedItems.has(item.id);

    return (
      <TouchableOpacity 
        style={styles.paymentCard}
        activeOpacity={0.7}
        onPress={() => toggleExpand(item.id)}
      >
        {/* Compact Header - Always Visible */}
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
                <User size={16} color={PrimaryColors.main} />
              </View>
            )}
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName} numberOfLines={1}>
                {doctor?.name ? `Dr. ${doctor.name}` : (item.doctor_id ? 'Doctor (ID: ' + item.doctor_id + ')' : 'Unknown Doctor')}
              </Text>
              {(jobRequirement?.department || jobSession?.job_requirement?.department) && (
                <Text style={styles.department} numberOfLines={1}>
                  {jobRequirement?.department || jobSession?.job_requirement?.department}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
              {getStatusIcon(item.status)}
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={20} color="#64748B" style={styles.expandIcon} />
            ) : (
              <ChevronDown size={20} color="#64748B" style={styles.expandIcon} />
            )}
          </View>
        </View>

        {/* Compact Amount - Always Visible */}
        <View style={styles.amountSectionCompact}>
          <Text style={styles.amountValueCompact}>₹{parseFloat(item.amount || 0).toFixed(2)}</Text>
          {item.created_at && (
            <Text style={styles.dateCompact}>
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>

        {/* Expandable Details - Horizontal Layout */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Payment Details - Horizontal Grid */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.detailsHorizontal}
              contentContainerStyle={styles.detailsHorizontalContent}
            >
              {item.created_at && (
                <View style={styles.detailCardHorizontal}>
                  <Calendar size={16} color={PrimaryColors.main} />
                  <Text style={styles.detailLabelHorizontal}>Payment Date</Text>
                  <Text style={styles.detailValueHorizontal}>
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              )}

              {jobSession?.session_date && (
                <View style={styles.detailCardHorizontal}>
                  <Clock size={16} color={PrimaryColors.main} />
                  <Text style={styles.detailLabelHorizontal}>Job Date</Text>
                  <Text style={styles.detailValueHorizontal}>
                    {new Date(jobSession.session_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              )}

              {item.payment_method && (
                <View style={styles.detailCardHorizontal}>
                  <CreditCard size={16} color={PrimaryColors.main} />
                  <Text style={styles.detailLabelHorizontal}>Method</Text>
                  <Text style={styles.detailValueHorizontal}>
                    {item.payment_method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Text>
                </View>
              )}

              {jobSession?.id && (
                <View style={styles.detailCardHorizontal}>
                  <FileText size={16} color={PrimaryColors.main} />
                  <Text style={styles.detailLabelHorizontal}>Session ID</Text>
                  <Text style={styles.detailValueHorizontal}>#{jobSession.id}</Text>
                </View>
              )}
            </ScrollView>

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
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenSafeArea style={styles.container} backgroundColor="#F8FAFC">
      <StatusBar style="light" backgroundColor="#0066FF" />
      
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

  // Payment Card - Compact
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
    alignItems: 'center',
    marginBottom: 10,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  department: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandIcon: {
    marginLeft: 4,
  },

  // Compact Amount Section
  amountSectionCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  amountValueCompact: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.main,
    letterSpacing: -0.3,
  },
  dateCompact: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // Expanded Content
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  detailsHorizontal: {
    marginBottom: 12,
  },
  detailsHorizontalContent: {
    gap: 10,
    paddingRight: 4,
  },
  detailCardHorizontal: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailLabelHorizontal: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 4,
  },
  detailValueHorizontal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
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
