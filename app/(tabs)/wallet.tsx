import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, TextInput, ActivityIndicator, StatusBar } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { DoctorPrimaryColors as PrimaryColors } from '@/constants/doctor-theme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BankingDetailsForm } from '@/components/BankingDetailsForm';
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
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet information');
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
      console.error('Withdrawal error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to process withdrawal'
      );
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
      <ScreenSafeArea>
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PrimaryColors.main} />
          </View>
        </ThemedView>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.main} />
      <ThemedView style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>My Wallet</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Manage your earnings</ThemedText>
          </View>

          {/* Payment Flow Stages */}
          <View style={styles.stagesCard}>
            <ThemedText style={styles.stagesTitle}>Payment Flow</ThemedText>
            <View style={styles.stagesContainer}>
              <View style={styles.stage}>
                <View style={[styles.stageIcon, { backgroundColor: PrimaryColors.main + '20' }]}>
                  <MaterialIcons name="work" size={20} color={PrimaryColors.main} />
                </View>
                <ThemedText style={styles.stageLabel}>Job Done</ThemedText>
              </View>
              <View style={styles.stageArrow}>
                <MaterialIcons name="arrow-forward" size={16} color="#ccc" />
              </View>
              <View style={styles.stage}>
                <View style={[styles.stageIcon, { backgroundColor: '#4CAF50' + '20' }]}>
                  <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                </View>
                <ThemedText style={styles.stageLabel}>Released</ThemedText>
              </View>
              <View style={styles.stageArrow}>
                <MaterialIcons name="arrow-forward" size={16} color="#ccc" />
              </View>
              <View style={styles.stage}>
                <View style={[styles.stageIcon, { backgroundColor: PrimaryColors.dark + '20' }]}>
                  <MaterialIcons name="account-balance" size={20} color={PrimaryColors.dark} />
                </View>
                <ThemedText style={styles.stageLabel}>Withdraw</ThemedText>
              </View>
            </View>
          </View>

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
              {transactions.filter(t => t.type === 'hold' && t.status === 'pending').map((transaction) => (
                <View key={transaction.id} style={styles.pendingTransactionItem}>
                  {transaction.job_session?.hospital && (
                    <View style={styles.pendingHospitalRow}>
                      <MaterialIcons name="local-hospital" size={14} color="#FF9800" />
                      <ThemedText style={styles.pendingHospitalName}>
                        {transaction.job_session.hospital.name}
                      </ThemedText>
                      <ThemedText style={styles.pendingTransactionAmount}>
                        ₹{transaction.amount.toFixed(2)}
                      </ThemedText>
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
            <View style={styles.statCard}>
              <MaterialIcons name="trending-up" size={28} color="#4CAF50" />
              <ThemedText style={styles.statValue}>
                ₹{wallet?.total_earned.toFixed(2) || '0.00'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total Earned</ThemedText>
            </View>

            <View style={styles.statCard}>
              <MaterialIcons name="account-balance" size={28} color={PrimaryColors.dark} />
              <ThemedText style={styles.statValue}>
                ₹{wallet?.total_withdrawn.toFixed(2) || '0.00'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total Withdrawn</ThemedText>
            </View>
          </View>

          {/* Banking Details */}
          <View style={styles.section}>
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
                      {bankingDetails.bank_account_holder_name}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.bankingRow}>
                  <MaterialIcons name="credit-card" size={18} color={PrimaryColors.main} />
                  <View style={styles.bankingInfo}>
                    <ThemedText style={styles.bankingLabel}>Account Number</ThemedText>
                    <ThemedText style={styles.bankingValue}>
                      ****{bankingDetails.bank_account_number?.slice(-4)}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.bankingRow}>
                  <MaterialIcons name="account-balance" size={18} color={PrimaryColors.main} />
                  <View style={styles.bankingInfo}>
                    <ThemedText style={styles.bankingLabel}>IFSC Code</ThemedText>
                    <ThemedText style={styles.bankingValue}>
                      {bankingDetails.bank_ifsc_code}
                    </ThemedText>
                  </View>
                </View>
                {bankingDetails.bank_name && (
                  <View style={styles.bankingRow}>
                    <MaterialIcons name="business" size={18} color={PrimaryColors.main} />
                    <View style={styles.bankingInfo}>
                      <ThemedText style={styles.bankingLabel}>Bank</ThemedText>
                      <ThemedText style={styles.bankingValue}>
                        {bankingDetails.bank_name}
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
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Transaction History</ThemedText>

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="receipt-long" size={64} color="#e0e0e0" />
                <ThemedText style={styles.emptyText}>No transactions yet</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Complete jobs to start earning
                </ThemedText>
              </View>
            ) : (
              transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
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
                      ₹{transaction.amount.toFixed(2)}
                    </ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: transaction.status === 'completed' ? '#4CAF50' + '20' : '#FF9800' + '20' }]}>
                      <ThemedText style={[styles.statusText, { color: transaction.status === 'completed' ? '#4CAF50' : '#FF9800' }]}>
                        {transaction.status}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stagesCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  stagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stage: {
    alignItems: 'center',
    flex: 1,
  },
  stageIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  stageArrow: {
    marginHorizontal: -4,
  },
  balanceContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editLink: {
    color: PrimaryColors.main,
    fontSize: 15,
    fontWeight: '600',
  },
  bankingCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 16,
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
