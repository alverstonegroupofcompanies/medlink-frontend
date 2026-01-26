import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { ArrowLeft, DollarSign, Clock, CheckCircle, XCircle, User, Building2 } from 'lucide-react-native';

export default function AdminPayments() {
  const router = useRouter();
  const [payments, setPayments] = useState<any>({
    all: [],
    in_escrow: [],
    released: [],
    refunded: [],
  });
  const [counts, setCounts] = useState<any>({
    total: 0,
    in_escrow: 0,
    released: 0,
    refunded: 0,
  });
  const [totals, setTotals] = useState<any>({
    total_amount: 0,
    escrow_amount: 0,
    released_amount: 0,
    refunded_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'in_escrow' | 'released' | 'refunded'>('all');

  useEffect(() => {
    loadPayments();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE_URL}/admin/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status) {
        setPayments(response.data.payments);
        setCounts(response.data.counts);
        setTotals(response.data.totals);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'released':
        return <CheckCircle size={20} color="#10b981" />;
      case 'refunded':
        return <XCircle size={20} color="#ef4444" />;
      default:
        return <Clock size={20} color="#f59e0b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'released':
        return '#10b981';
      case 'refunded':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'released':
        return 'Released';
      case 'refunded':
        return 'Refunded';
      default:
        return 'In Escrow';
    }
  };

  const handleApprovePayment = async (paymentId: number) => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      // Optimistic update
      setLoading(true); // briefly show loading or just spinner
      const response = await axios.post(
        `${API_BASE_URL}/admin/payments/${paymentId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success || response.data.message) {
        // Reload to get fresh status
        loadPayments();
        Alert.alert('Success', response.data.message || 'Payment approved');
      }
    } catch (error: any) {
        console.error('Approval error:', error);
        Alert.alert('Error', error.response?.data?.error || 'Failed to approve payment');
        setLoading(false);
    }
  };

  const currentPayments = payments[activeTab] || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e293b" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <DollarSign size={24} color="#2563eb" />
          <Text style={styles.summaryValue}>₹{totals.total_amount?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.summaryLabel}>Total Amount</Text>
        </View>
        <View style={styles.summaryCard}>
          <Clock size={24} color="#f59e0b" />
          <Text style={styles.summaryValue}>₹{totals.escrow_amount?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.summaryLabel}>In Escrow</Text>
        </View>
        <View style={styles.summaryCard}>
          <CheckCircle size={24} color="#10b981" />
          <Text style={styles.summaryValue}>₹{totals.released_amount?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.summaryLabel}>Released</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({counts.total})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'in_escrow' && styles.tabActive]}
          onPress={() => setActiveTab('in_escrow')}
        >
          <Text style={[styles.tabText, activeTab === 'in_escrow' && styles.tabTextActive]}>
            Escrow ({counts.in_escrow})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'released' && styles.tabActive]}
          onPress={() => setActiveTab('released')}
        >
          <Text style={[styles.tabText, activeTab === 'released' && styles.tabTextActive]}>
            Released ({counts.released})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'refunded' && styles.tabActive]}
          onPress={() => setActiveTab('refunded')}
        >
          <Text style={[styles.tabText, activeTab === 'refunded' && styles.tabTextActive]}>
            Refunded ({counts.refunded})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadPayments} />
        }
      >
        {currentPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <DollarSign size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No payments found</Text>
          </View>
        ) : (
          currentPayments.map((payment: any) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.amountSection}>
                  <DollarSign size={24} color="#10b981" />
                  <Text style={styles.amountText}>₹{typeof payment.amount === 'number' ? payment.amount.toFixed(2) : parseFloat(payment.amount || '0').toFixed(2)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(payment.status)}15` }]}>
                  {getStatusIcon(payment.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                    {getStatusText(payment.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.paymentDetails}>
                {payment.doctor && (
                  <View style={styles.participantRow}>
                    <User size={16} color="#64748b" />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantLabel}>Doctor:</Text>
                      <Text style={styles.participantName}>{payment.doctor.name}</Text>
                      <Text style={styles.participantEmail}>{payment.doctor.email}</Text>
                    </View>
                  </View>
                )}

                {payment.hospital && (
                  <View style={styles.participantRow}>
                    <Building2 size={16} color="#64748b" />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantLabel}>Hospital:</Text>
                      <Text style={styles.participantName}>{payment.hospital.name}</Text>
                      <Text style={styles.participantEmail}>{payment.hospital.email}</Text>
                    </View>
                  </View>
                )}

                {payment.job_session && (
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionLabel}>Job Session:</Text>
                    <Text style={styles.sessionValue}>
                      {payment.job_session.department} - {payment.job_session.status}
                    </Text>
                  </View>
                )}

                {payment.escrow_date && (
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Escrow Date:</Text>
                    <Text style={styles.dateValue}>
                      {new Date(payment.escrow_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {payment.released_date && (
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Released Date:</Text>
                    <Text style={styles.dateValue}>
                      {new Date(payment.released_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <Text style={styles.createdDate}>
                  Created: {new Date(payment.created_at).toLocaleDateString()}
                </Text>

                {/* Approval Status & Actions */}
                {payment.status !== 'released' && payment.status !== 'refunded' && (
                  <View style={styles.actionSection}>
                    <View style={styles.approvalStatus}>
                        <View style={styles.approvalStep}>
                            <Text style={[styles.stepLabel, payment.hospital_approved_at && styles.stepLabelActive]}>Hospital</Text>
                            {payment.hospital_approved_at ? <CheckCircle size={14} color="#10b981" /> : <Clock size={14} color="#94a3b8" />}
                        </View>
                        <View style={styles.approvalLine} />
                        <View style={styles.approvalStep}>
                            <Text style={[styles.stepLabel, payment.admin_approved_at && styles.stepLabelActive]}>Admin</Text>
                            {payment.admin_approved_at ? <CheckCircle size={14} color="#10b981" /> : <Clock size={14} color="#94a3b8" />}
                        </View>
                    </View>

                    {!payment.admin_approved_at && (
                        <TouchableOpacity 
                            style={styles.approveButton}
                            onPress={() => handleApprovePayment(payment.id)}
                        >
                            <Text style={styles.approveButtonText}>
                                {payment.hospital_approved_at ? 'Approve Release' : 'Approve Payment'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {payment.admin_approved_at && !payment.hospital_approved_at && (
                        <View style={styles.waitingBadge}>
                            <Text style={styles.waitingText}>Waiting for Hospital</Text>
                        </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#1e293b',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  paymentCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentDetails: {
    gap: 12,
  },
  participantRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  participantInfo: {
    flex: 1,
  },
  participantLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  participantEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  sessionInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sessionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  sessionValue: {
    fontSize: 14,
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  createdDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  approvalStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  approvalStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#1e293b',
  },
  approvalLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  approveButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  waitingBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  waitingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});
