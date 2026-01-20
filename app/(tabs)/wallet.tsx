import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, TextInput, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DoctorPrimaryColors as PrimaryColors } from '@/constants/doctor-theme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BankingDetailsForm } from '@/components/BankingDetailsForm';
import API from '../api';
import echo from '@/services/echo';
import { getDoctorInfo } from '@/utils/auth';
import { showNotificationFromData } from '@/utils/notifications';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';

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
  const insets = useSafeAreaInsets();
  const safeBottomPadding = useSafeBottomPadding();
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
  const [expandedTransactionId, setExpandedTransactionId] = useState<number | null>(null);

  // Ensure status bar stays blue always - CRITICAL
  useFocusEffect(
    React.useCallback(() => {
      // Set immediately for both platforms
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#2563EB', true);
        StatusBar.setTranslucent(false);
      }
      // Force update again after a brief delay to ensure it sticks
      const timeout = setTimeout(() => {
        StatusBar.setBarStyle('light-content', true);
        if (Platform.OS === 'android') {
          StatusBar.setBackgroundColor('#2563EB', true);
        }
      }, 100);
      return () => {
        clearTimeout(timeout);
      };
    }, [])
  );

  // Also set on mount to ensure it's blue from the start
  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#2563EB', true);
      StatusBar.setTranslucent(false);
    }
  }, []);

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
        return '#6B7280';
      case 'release':
        return '#2563EB';
      case 'withdrawal':
        return '#1F2937';
      case 'credit':
        return '#2563EB';
      case 'debit':
        return '#1F2937';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor="#2563EB" statusBarStyle="light-content" style={styles.mainContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} animated={true} />
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PrimaryColors.main} />
          </View>
        </ThemedView>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor="#2563EB" statusBarStyle="light-content" style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} animated={true} />
      
      {/* Header with Blue Background */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 12, 20) }]}>
        <View style={styles.headerContent}>
          <View>
            <ThemedText
              style={styles.headerTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              My Wallet
            </ThemedText>
            <ThemedText style={styles.headerSubtitle} numberOfLines={2}>
              Manage your earnings & payments
            </ThemedText>
          </View>
        </View>
      </View>

      <ThemedView style={styles.contentContainer}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PrimaryColors.main} />
          }
          contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: safeBottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Dashboard Cards */}
          <View style={styles.dashboardContainer}>
            {/* Row 1: Combined Available + Pending (single card) */}
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
                      <ThemedText style={styles.dashboardCardTitle}>Wallet Balance</ThemedText>
                      <ThemedText style={styles.dashboardCardSubtitle}>Available + Pending</ThemedText>
                    </View>
                  </View>
                  
                  <View style={styles.balanceSplitRow}>
                    <View style={styles.balanceSplitCol}>
                      <ThemedText style={styles.balanceSplitLabel}>Available</ThemedText>
                      <ThemedText
                        style={styles.balanceSplitAmount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                      >
                        ₹{wallet?.balance.toFixed(2) || '0.00'}
                      </ThemedText>
                    </View>

                    <View style={styles.balanceSplitDivider} />

                    <View style={styles.balanceSplitCol}>
                      <ThemedText style={styles.balanceSplitLabel}>Pending</ThemedText>
                      <ThemedText
                        style={styles.balanceSplitAmount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                      >
                        ₹{wallet?.pending_balance.toFixed(2) || '0.00'}
                      </ThemedText>
                      <ThemedText style={styles.balanceSplitHint}>Processing</ThemedText>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dashboardCtaButton}
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
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="account-balance" size={16} color="#2563EB" />
                    <ThemedText style={styles.dashboardCtaText}>Withdraw</ThemedText>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>

            {/* Row 2: Total Earned & Total Withdrawn */}
            <View style={styles.dashboardRow}>
              {/* Total Earned */}
              <View style={styles.dashboardCardTertiary}>
                <View style={styles.dashboardCardContent}>
                  <View style={styles.dashboardIconSquare}>
                    <MaterialIcons name="trending-up" size={20} color="#10B981" />
                  </View>
                  <View style={styles.dashboardCardBody}>
                    <ThemedText style={styles.dashboardCardLabel}>Total Earned</ThemedText>
                    <ThemedText
                      style={styles.dashboardCardValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      ₹{wallet?.total_earned.toFixed(2) || '0.00'}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Total Withdrawn */}
              <View style={styles.dashboardCardTertiary}>
                <View style={styles.dashboardCardContent}>
                  <View style={[styles.dashboardIconSquare, styles.dashboardIconSquareWithdrawn]}>
                    <MaterialIcons name="account-balance" size={20} color="#2563EB" />
                  </View>
                  <View style={styles.dashboardCardBody}>
                    <ThemedText style={styles.dashboardCardLabel}>Total Withdrawn</ThemedText>
                    <ThemedText
                      style={styles.dashboardCardValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      ₹{wallet?.total_withdrawn.toFixed(2) || '0.00'}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Transactions - Bank Statement Style */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Transaction History</ThemedText>
            </View>

            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              {(['all', 'pending', 'completed'] as const).map((filter) => (
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
                  return true;
                })
                .map((transaction) => {
                  const isExpanded = expandedTransactionId === transaction.id;
                  const hasDetails = transaction.job_session?.hospital;
                  const paymentStatus = transaction.payment_approval_status;
                  const hospitalName = transaction.job_session?.hospital?.name;
                  
                  // Simple status - no admin mentions
                  const getSimpleStatus = () => {
                    if (transaction.status === 'completed') return 'Completed';
                    if (transaction.status === 'pending') {
                      if (paymentStatus?.is_hospital_approved && paymentStatus?.is_admin_approved) {
                        return 'Processing';
                      }
                      if (paymentStatus?.is_hospital_approved) {
                        return 'Processing';
                      }
                      return 'Pending';
                    }
                    return transaction.status;
                  };

                  // Make "who pays who" clear for users
                  const getFlowLine = () => {
                    if (transaction.type === 'withdrawal') return 'You → Bank';
                    if (transaction.type === 'hold') return 'Hospital → Escrow';
                    if (transaction.type === 'release') return 'Escrow → You';
                    if (transaction.type === 'credit') return 'Hospital → You';
                    if (transaction.type === 'debit') return 'You → Hospital';
                    return '—';
                  };

                  const getPrimaryTitle = () => {
                    if (transaction.type === 'withdrawal') return 'Withdrawal';
                    if (transaction.type === 'hold') return 'Payment held';
                    if (transaction.type === 'release') return 'Payment released';
                    if (transaction.type === 'credit') return 'Payment received';
                    if (transaction.type === 'debit') return 'Payment sent';
                    return transaction.description || 'Transaction';
                  };

                  const getSecondaryLine = () => {
                    if (hospitalName) return hospitalName;
                    if (transaction.type === 'withdrawal') return 'Bank transfer';
                    return transaction.description || '';
                  };

                  return (
                    <View key={transaction.id}>
                      <TouchableOpacity
                        style={styles.transactionRow}
                        onPress={() => hasDetails && setExpandedTransactionId(isExpanded ? null : transaction.id)}
                        activeOpacity={hasDetails ? 0.7 : 1}
                      >
                        <View style={styles.transactionLeft}>
                          <View style={styles.transactionDateColumn}>
                            <ThemedText style={styles.transactionDateDay}>
                              {new Date(transaction.created_at).getDate()}
                            </ThemedText>
                            <ThemedText style={styles.transactionDateMonth}>
                              {new Date(transaction.created_at).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}
                            </ThemedText>
                          </View>
                          <View style={styles.transactionInfoColumn}>
                            <ThemedText style={styles.transactionDescription}>
                              {getPrimaryTitle()}
                            </ThemedText>
                            <ThemedText style={styles.transactionHospital}>
                              {getSecondaryLine()}
                            </ThemedText>
                            <View style={styles.transactionStatusRow}>
                              <View style={[styles.transactionStatusDot, { 
                                backgroundColor: transaction.status === 'completed' ? '#2563EB' : '#9CA3AF' 
                              }]} />
                              <ThemedText style={[styles.transactionStatusText, { 
                                color: transaction.status === 'completed' ? '#2563EB' : '#6B7280' 
                              }]}>
                                {getSimpleStatus()}
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                        <View style={styles.transactionRight}>
                          <ThemedText
                            style={[
                              styles.transactionAmount,
                              {
                                color: transaction.type === 'credit' || transaction.type === 'release' ? '#2563EB' : '#1F2937',
                              },
                            ]}
                          >
                            {transaction.type === 'release' || transaction.type === 'credit' ? '+' : transaction.type === 'hold' ? '' : '-'}
                            ₹{Number(transaction.amount || 0).toFixed(2)}
                          </ThemedText>
                          {hasDetails && (
                            <MaterialIcons 
                              name={isExpanded ? "expand-less" : "expand-more"} 
                              size={18} 
                              color="#9CA3AF" 
                              style={styles.expandIcon}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                      {isExpanded && hasDetails && (
                        <View style={styles.transactionDetails}>
                          <View style={styles.detailRow}>
                            <ThemedText style={styles.detailLabel}>Date & Time:</ThemedText>
                            <ThemedText style={styles.detailValue}>
                              {new Date(transaction.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </ThemedText>
                          </View>
                          {transaction.job_session?.hospital && (
                            <View style={styles.detailRow}>
                              <ThemedText style={styles.detailLabel}>Hospital:</ThemedText>
                              <ThemedText style={styles.detailValue}>{transaction.job_session.hospital.name}</ThemedText>
                            </View>
                          )}
                        </View>
                      )}
                      {transaction.id !== transactions[transactions.length - 1]?.id && (
                        <View style={styles.transactionDivider} />
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
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    // MUST NOT override ScreenSafeArea backgroundColor, or iOS status bar area can turn white.
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  headerContainer: {
    backgroundColor: '#2563EB',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  contentContainer: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingTop: 0,
    // paddingBottom is now set dynamically using safeBottomPadding
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
    fontSize: 15,
    fontWeight: '600',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stageLabelHorizontal: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  stageLine: {
    width: 16,
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  // Dashboard Cards - Modern 2x2 Grid Layout
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
    flex: 1.4,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
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
  dashboardCardSecondary: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6366F1',
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
  balanceSplitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  balanceSplitCol: {
    flex: 1,
    minWidth: 0,
  },
  balanceSplitDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 1,
  },
  balanceSplitLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  balanceSplitAmount: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  balanceSplitHint: {
    marginTop: 4,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
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
  dashboardCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  dashboardCtaText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  dashboardCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dashboardIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dashboardIconSquareWithdrawn: {
    backgroundColor: '#EFF6FF',
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
  // (pendingCard old styles removed; replaced with pendingHeroCard)
  pendingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  pendingStatusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  pendingTransactionItem: {
    marginTop: 8,
  },
  pendingHospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pendingHospitalName: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  pendingTransactionAmount: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 16,
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
    flexWrap: 'wrap',
  },
  transactionHospital: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    flexWrap: 'wrap',
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
  hospitalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hospitalName: {
    fontSize: 11,
    color: '#1F2937',
    fontWeight: '600',
    marginLeft: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    flexShrink: 0,
    minWidth: 88,
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
