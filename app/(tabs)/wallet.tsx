import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, TextInput, ActivityIndicator, StatusBar } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { DoctorPrimaryColors as PrimaryColors } from '@/constants/doctor-theme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BankingDetailsForm } from '@/components/BankingDetailsForm';
import { PaymentStatusCard } from '@/components/PaymentStatusCard';
import API from '../api';
import echo from '@/services/echo';
import { getDoctorInfo } from '@/utils/auth';
import { showNotificationFromData } from '@/utils/notifications';

interface WalletData {
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  pending_transactions?: Transaction[];
}

interface Transaction {
  id: number;
  type: 'credit' | 'debit' | 'hold' | 'release' | 'withdrawal';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  job_session?: {
    hospital?: {
      name: string;
    };
  };
  payment_approval_status?: {
    hospital_approved_at: string | null;
    admin_approved_at: string | null;
    approval_status: string;
    payment_status: string;
    is_hospital_approved: boolean;
    is_admin_approved: boolean;
    is_ready_for_release: boolean;
  };
}

interface BankingDetails {
  bank_account_holder_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_name?: string;
  bank_branch?: string;
  upi_id?: string;
  banking_verified: boolean;
  has_banking_details: boolean;
}

export default function WalletScreen() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBankingForm, setShowBankingForm] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'pending' | 'completed' | 'withdrawals'>('all');
  const [expandedStages, setExpandedStages] = useState(false);

  useEffect(() => {
    fetchWalletData();

    // Set up real-time listener
    const setupListener = async () => {
      const doctor = await getDoctorInfo();
      if (doctor?.id) {
        console.log(`🔌 Wallet subscribing to channel: App.Models.User.${doctor.id}`);
        echo.private(`App.Models.User.${doctor.id}`)
          .listen('.PaymentReleased', (e: any) => {
            console.log('💰 Payment Released event received:', e);
            
            // Show notification
            showNotificationFromData({
              title: 'Payment Received',
              message: e.message,
              type: 'success',
              data: { type: 'payment_received', amount: e.amount }
            });

            // Refresh wallet data immediately
            fetchWalletData();
          });
      }
    };

    setupListener();

    return () => {
      // Cleanup listener
      getDoctorInfo().then(doctor => {
        if (doctor?.id) {
          echo.leave(`App.Models.User.${doctor.id}`);
        }
      });
    };
  }, []);

  const fetchWalletData = async () => {
    try {
      const [walletRes, transactionsRes, bankingRes] = await Promise.all([
        API.get('/doctor/wallet'),
        API.get('/doctor/wallet/transactions'),
        API.get('/doctor/banking-details'),
      ]);

      setWallet(walletRes.data.wallet);
      setTransactions(transactionsRes.data.transactions.data || transactionsRes.data.transactions);
      setBankingDetails(bankingRes.data.banking_details);
    } catch (error: any) {
      if (__DEV__) {
        console.error('Failed to fetch wallet data:', error);
      }
      const message = error?.userFriendlyMessage || error?.message || 'Unable to load wallet information. Please try again.';
      Alert.alert('Unable to Load', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleBankingSuccess = () => {
    // Refresh wallet data after banking details are saved
    fetchWalletData();
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount < 100) {
      Alert.alert('Error', 'Minimum withdrawal amount is ₹100');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setWithdrawing(true);

    try {
      const response = await API.post('/doctor/wallet/withdraw', {
        amount,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Withdrawal request submitted successfully');
        setShowWithdrawal(false);
        setWithdrawalAmount('');
        fetchWalletData();
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Withdrawal error:', error);
      }
      const message = error?.userFriendlyMessage || error?.response?.data?.message || 'Unable to process withdrawal. Please try again.';
      Alert.alert('Withdrawal Failed', message);
    } finally {
      setWithdrawing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'hold':
        return 'lock-clock';
      case 'release':
        return 'check-circle';
      case 'withdrawal':
        return 'account-balance-wallet';
      case 'credit':
        return 'arrow-downward';
      case 'debit':
        return 'arrow-upward';
      default:
        return 'swap-horiz';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'hold':
        return '#FF9800';
      case 'release':
        return '#4CAF50';
      case 'withdrawal':
        return PrimaryColors.main;
      case 'credit':
        return '#4CAF50';
      case 'debit':
        return '#F44336';
      default:
        return '#999';
    }
  };

  if (loading) {
    return (
      <View style={styles.mainContainer}>
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PrimaryColors.main} />
          </View>
        </ThemedView>
      </View>
    );
  }

  return (

    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" translucent={true} />
      
      {/* Premium Header Background */}
      <LinearGradient
        colors={[PrimaryColors.main, PrimaryColors.dark]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={{ width: '100%' }}>
          <View style={styles.headerContent}>
            <View>
              <ThemedText style={styles.headerTitle}>My Wallet</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Manage your earnings & payments</ThemedText>
            </View>
            <View style={styles.headerIcon}>
              <MaterialIcons name="account-balance-wallet" size={32} color="rgba(255,255,255,0.2)" />
            </View>
          </View>
        </View>
      </LinearGradient>

      <ThemedView style={styles.contentContainer}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PrimaryColors.main} />
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Payment Flow Stages - Horizontal with Expand/Collapse */}
          <TouchableOpacity 
            style={styles.stagesCard}
            onPress={() => setExpandedStages(!expandedStages)}
            activeOpacity={0.8}
          >
            <View style={styles.stagesHeader}>
              <ThemedText style={styles.stagesTitle}>Payment Process</ThemedText>
              <MaterialIcons 
                name={expandedStages ? "expand-less" : "expand-more"} 
                size={24} 
                color={PrimaryColors.main} 
              />
            </View>
            {expandedStages && (
              <View style={styles.stagesContainerHorizontal}>
                <View style={styles.stageHorizontal}>
                  <View style={[styles.stageIconHorizontal, { backgroundColor: '#E3F2FD' }]}>
                    <MaterialIcons name="work" size={18} color={PrimaryColors.main} />
                  </View>
                  <ThemedText style={styles.stageLabelHorizontal}>Job Done</ThemedText>
                  <View style={[styles.stageLine, { backgroundColor: '#E0E0E0' }]} />
                </View>
                <View style={styles.stageHorizontal}>
                  <View style={[styles.stageIconHorizontal, { backgroundColor: '#FFF3E0' }]}>
                    <MaterialIcons name="schedule" size={18} color="#FF9800" />
                  </View>
                  <ThemedText style={styles.stageLabelHorizontal}>Hospital Approval</ThemedText>
                  <View style={[styles.stageLine, { backgroundColor: '#E0E0E0' }]} />
                </View>
                <View style={styles.stageHorizontal}>
                  <View style={[styles.stageIconHorizontal, { backgroundColor: '#E8F5E9' }]}>
                    <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
                  </View>
                  <ThemedText style={styles.stageLabelHorizontal}>Released</ThemedText>
                  <View style={[styles.stageLine, { backgroundColor: '#E0E0E0' }]} />
                </View>
                <View style={styles.stageHorizontal}>
                  <View style={[styles.stageIconHorizontal, { backgroundColor: '#FFF3E0' }]}>
                    <MaterialIcons name="account-balance" size={18} color="#FF9800" />
                  </View>
                  <ThemedText style={styles.stageLabelHorizontal}>Withdraw</ThemedText>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Balance Cards */}
          <View style={styles.balanceContainer}>
            {/* Available Balance */}
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              style={styles.balanceCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.balanceHeader}>
                <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
                <ThemedText style={styles.balanceLabel}>Available Balance</ThemedText>
              </View>
              <View style={styles.balanceAmountContainer}>
                <ThemedText style={styles.balanceAmount}>
                  ₹{wallet?.balance.toFixed(2) || '0.00'}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.withdrawButton}
                onPress={() => {
                  if (!bankingDetails?.has_banking_details) {
                    Alert.alert(
                      'Banking Details Required',
                      'Please add your banking details before withdrawing',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Add Now', onPress: () => setShowBankingForm(true) },
                      ]
                    );
                  } else if ((wallet?.balance || 0) < 100) {
                    Alert.alert('Insufficient Balance', 'Minimum withdrawal amount is ₹100');
                  } else {
                    setShowWithdrawal(true);
                  }
                }}
              >
                <MaterialIcons name="account-balance" size={18} color="#fff" />
                <ThemedText style={styles.withdrawButtonText}>Withdraw to Bank</ThemedText>
              </TouchableOpacity>
            </LinearGradient>

            {/* Pending Balance */}
            <View style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <MaterialIcons name="schedule" size={20} color="#FF9800" />
                <ThemedText style={styles.pendingLabel}>Pending (Held)</ThemedText>
              </View>
              <ThemedText style={styles.pendingAmount}>
                ₹{wallet?.pending_balance.toFixed(2) || '0.00'}
              </ThemedText>
              {transactions.filter(t => (t.type === 'credit' || t.type === 'hold') && t.status === 'pending').slice(0, 3).map((transaction) => (
                <View key={transaction.id} style={styles.pendingTransactionItem}>
                  {transaction.job_session?.hospital && (
                    <View style={styles.pendingHospitalRow}>
                      <MaterialIcons name="local-hospital" size={14} color="#FF9800" />
                      <ThemedText style={styles.pendingHospitalName}>
                        {transaction.job_session.hospital.name}
                      </ThemedText>
                      <ThemedText style={styles.pendingTransactionAmount}>
                        ₹{Number(transaction.amount || 0).toFixed(2)}
                      </ThemedText>
                    </View>
                  )}
                  {transaction.payment_approval_status && (
                    <View style={styles.approvalBadges}>
                      {transaction.payment_approval_status.is_hospital_approved && (
                        <View style={[styles.approvalBadge, { backgroundColor: '#E3F2FD' }]}>
                          <MaterialIcons name="check-circle" size={12} color="#2196F3" />
                          <ThemedText style={[styles.approvalBadgeText, { color: '#2196F3' }]}>Hospital</ThemedText>
                        </View>
                      )}
                      {transaction.payment_approval_status.is_admin_approved && (
                        <View style={[styles.approvalBadge, { backgroundColor: '#F3E5F5' }]}>
                          <MaterialIcons name="verified" size={12} color="#9C27B0" />
                          <ThemedText style={[styles.approvalBadgeText, { color: '#9C27B0' }]}>Admin</ThemedText>
                        </View>
                      )}
                      {!transaction.payment_approval_status.is_hospital_approved && (
                        <View style={[styles.approvalBadge, { backgroundColor: '#FFF3E0' }]}>
                          <MaterialIcons name="schedule" size={12} color="#FF9800" />
                          <ThemedText style={[styles.approvalBadgeText, { color: '#FF9800' }]}>Waiting</ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
              <ThemedText style={styles.pendingNote}>
                Released after hospital approval
              </ThemedText>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#D1FAE5' }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <MaterialIcons name="trending-up" size={24} color="#10B981" />
              </View>
              <ThemedText style={[styles.statValue, { color: '#10B981', marginTop: 12 }]}>
                ₹{wallet?.total_earned.toFixed(2) || '0.00'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total Earned</ThemedText>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FDE68A' }]}>
                <MaterialIcons name="account-balance" size={24} color={PrimaryColors.dark} />
              </View>
              <ThemedText style={[styles.statValue, { color: PrimaryColors.dark, marginTop: 12 }]}>
                ₹{wallet?.total_withdrawn.toFixed(2) || '0.00'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total Withdrawn</ThemedText>
            </View>
          </View>

          {/* Banking Details */}
          <View style={[styles.section, { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' }]}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Banking Details</ThemedText>
              <TouchableOpacity onPress={() => setShowBankingForm(true)}>
                <ThemedText style={styles.editLink}>
                  {bankingDetails?.has_banking_details ? 'Edit' : 'Add'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {bankingDetails?.has_banking_details ? (
              <View style={styles.bankingCard}>
                <View style={styles.bankingRow}>
                  <MaterialIcons name="person" size={18} color={PrimaryColors.main} />
                  <View style={styles.bankingInfo}>
                    <ThemedText style={styles.bankingLabel}>Account Holder</ThemedText>
                    <ThemedText style={styles.bankingValue}>
                      {bankingDetails?.bank_account_holder_name}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.bankingRow}>
                  <MaterialIcons name="credit-card" size={18} color={PrimaryColors.main} />
                  <View style={styles.bankingInfo}>
                    <ThemedText style={styles.bankingLabel}>Account Number</ThemedText>
                    <ThemedText style={styles.bankingValue}>
                      ****{bankingDetails?.bank_account_number?.slice(-4)}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.bankingRow}>
                  <MaterialIcons name="account-balance" size={18} color={PrimaryColors.main} />
                  <View style={styles.bankingInfo}>
                    <ThemedText style={styles.bankingLabel}>IFSC Code</ThemedText>
                    <ThemedText style={styles.bankingValue}>
                      {bankingDetails?.bank_ifsc_code}
                    </ThemedText>
                  </View>
                </View>
                {bankingDetails?.bank_name && (
                  <View style={styles.bankingRow}>
                    <MaterialIcons name="business" size={18} color={PrimaryColors.main} />
                    <View style={styles.bankingInfo}>
                      <ThemedText style={styles.bankingLabel}>Bank</ThemedText>
                      <ThemedText style={styles.bankingValue}>
                        {bankingDetails?.bank_name}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBankingButton}
                onPress={() => setShowBankingForm(true)}
              >
                <MaterialIcons name="add-circle-outline" size={32} color={PrimaryColors.main} />
                <ThemedText style={styles.addBankingText}>
                  Add Banking Details
                </ThemedText>
                <ThemedText style={styles.addBankingSubtext}>
                  Required to receive payments
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Transactions */}
          <View style={[styles.section, { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' }]}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Transaction History</ThemedText>
            </View>

            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              {(['all', 'pending', 'completed', 'withdrawals'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    transactionFilter === filter && styles.filterButtonActive,
                  ]}
                  onPress={() => setTransactionFilter(filter)}
                >
                  <ThemedText
                    style={[
                      styles.filterButtonText,
                      transactionFilter === filter && styles.filterButtonTextActive,
                    ]}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="receipt-long" size={64} color="#e0e0e0" />
                <ThemedText style={styles.emptyText}>No transactions yet</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Complete jobs to start earning
                </ThemedText>
              </View>
            ) : (
              transactions
                .filter((t) => {
                  if (transactionFilter === 'all') return true;
                  if (transactionFilter === 'pending') return t.status === 'pending';
                  if (transactionFilter === 'completed') return t.status === 'completed';
                  if (transactionFilter === 'withdrawals') return t.type === 'debit';
                  return true;
                })
                .map((transaction) => {
                  // Show PaymentStatusCard for pending payments with approval status
                  const showPaymentStatus = transaction.payment_approval_status && 
                    transaction.status === 'pending' && 
                    (transaction.type === 'credit' || transaction.type === 'hold');

                  return (
                    <View key={transaction.id}>
                      <View style={styles.transactionCard}>
                        <View style={styles.transactionLeft}>
                          <View
                            style={[
                              styles.transactionIcon,
                              { backgroundColor: getTransactionColor(transaction.type) + '15' },
                            ]}
                          >
                            <MaterialIcons
                              name={getTransactionIcon(transaction.type) as any}
                              size={22}
                              color={getTransactionColor(transaction.type)}
                            />
                          </View>
                          <View style={styles.transactionInfo}>
                            <ThemedText style={styles.transactionDescription}>
                              {transaction.description}
                            </ThemedText>
                            {transaction.job_session?.hospital && (
                              <View style={styles.hospitalBadge}>
                                <MaterialIcons name="local-hospital" size={12} color="#2196F3" />
                                <ThemedText style={styles.hospitalName}>
                                  {transaction.job_session.hospital.name}
                                </ThemedText>
                              </View>
                            )}
                            {transaction.payment_approval_status && (
                              <View style={styles.approvalBadges}>
                                {transaction.payment_approval_status.is_hospital_approved && (
                                  <View style={[styles.approvalBadge, { backgroundColor: '#E3F2FD' }]}>
                                    <MaterialIcons name="check-circle" size={12} color="#2196F3" />
                                    <ThemedText style={[styles.approvalBadgeText, { color: '#2196F3' }]}>Hospital</ThemedText>
                                  </View>
                                )}
                                {transaction.payment_approval_status.is_admin_approved && (
                                  <View style={[styles.approvalBadge, { backgroundColor: '#F3E5F5' }]}>
                                    <MaterialIcons name="verified" size={12} color="#9C27B0" />
                                    <ThemedText style={[styles.approvalBadgeText, { color: '#9C27B0' }]}>Admin</ThemedText>
                                  </View>
                                )}
                                {!transaction.payment_approval_status.is_hospital_approved && (
                                  <View style={[styles.approvalBadge, { backgroundColor: '#FFF3E0' }]}>
                                    <MaterialIcons name="schedule" size={12} color="#FF9800" />
                                    <ThemedText style={[styles.approvalBadgeText, { color: '#FF9800' }]}>Waiting</ThemedText>
                                  </View>
                                )}
                              </View>
                            )}
                            <ThemedText style={styles.transactionDate}>
                              {new Date(transaction.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={styles.transactionRight}>
                          <ThemedText
                            style={[
                              styles.transactionAmount,
                              {
                                color: getTransactionColor(transaction.type),
                              },
                            ]}
                          >
                            {transaction.type === 'release' || transaction.type === 'credit' ? '+' : transaction.type === 'hold' ? '' : '-'}
                            ₹{Number(transaction.amount || 0).toFixed(2)}
                          </ThemedText>
                          <View style={[styles.statusBadge, { backgroundColor: transaction.status === 'completed' ? '#4CAF50' + '20' : '#FF9800' + '20' }]}>
                            <ThemedText style={[styles.statusText, { color: transaction.status === 'completed' ? '#4CAF50' : '#FF9800' }]}>
                              {transaction.status}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                      {showPaymentStatus && transaction.payment_approval_status && (
                        <PaymentStatusCard
                          hospitalApprovedAt={transaction.payment_approval_status.hospital_approved_at}
                          adminApprovedAt={transaction.payment_approval_status.admin_approved_at}
                          approvalStatus={transaction.payment_approval_status.approval_status}
                          paymentStatus={transaction.payment_approval_status.payment_status}
                          amount={transaction.amount != null ? Number(transaction.amount) : 0}
                          hospitalName={transaction.job_session?.hospital?.name}
                        />
                      )}
                    </View>
                  );
                })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Withdrawal Modal */}
        {showWithdrawal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Withdraw to Bank</ThemedText>

              <View style={styles.modalInfo}>
                <MaterialIcons name="info-outline" size={20} color={PrimaryColors.main} />
                <ThemedText style={styles.modalInfoText}>
                  Available Balance: ₹{wallet?.balance.toFixed(2)}
                </ThemedText>
              </View>

              <TextInput
                style={styles.modalInput}
                value={withdrawalAmount}
                onChangeText={setWithdrawalAmount}
                placeholder="Enter amount (min ₹100)"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowWithdrawal(false);
                    setWithdrawalAmount('');
                  }}
                >
                  <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmButton, withdrawing && styles.modalButtonDisabled]}
                  onPress={handleWithdraw}
                  disabled={withdrawing}
                >
                  {withdrawing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.modalConfirmText}>Withdraw</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Banking Details Form */}
        <BankingDetailsForm
          visible={showBankingForm}
          onClose={() => setShowBankingForm(false)}
          onSuccess={handleBankingSuccess}
          initialData={bankingDetails || undefined}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 60, // Extra padding for overlap
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: -40, // Negative margin to pull content up
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  contentContainer: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stagesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stagesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  stagesContainerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  stageHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stageIconHorizontal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stageLabelHorizontal: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    flex: 1,
  },
  stageLine: {
    width: 20,
    height: 2,
    marginHorizontal: 4,
  },
  balanceContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 16,
  },
  balanceCard: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    marginLeft: 10,
    fontWeight: '500',
  },
  balanceAmountContainer: {
    paddingVertical: 8,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    lineHeight: 48,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: 14,
    borderRadius: 12,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  pendingAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 6,
  },
  pendingNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  pendingTransactionItem: {
    marginTop: 8,
  },
  pendingHospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  pendingHospitalName: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  pendingTransactionAmount: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: PrimaryColors.main,
    borderColor: PrimaryColors.main,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  approvalBadges: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  editLink: {
    color: PrimaryColors.main,
    fontSize: 15,
    fontWeight: '600',
  },
  bankingCard: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bankingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  bankingLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  bankingValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  addBankingButton: {
    backgroundColor: '#F9FAFB',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PrimaryColors.main,
    borderStyle: 'dashed',
  },
  addBankingText: {
    color: PrimaryColors.main,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
  },
  addBankingSubtext: {
    color: '#999',
    fontSize: 13,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 13,
    marginTop: 6,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  hospitalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  hospitalName: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '88%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PrimaryColors.main + '10',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalInfoText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: '#333',
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: PrimaryColors.main,
    marginLeft: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonDisabled: {
    backgroundColor: '#ccc',
  },
});
