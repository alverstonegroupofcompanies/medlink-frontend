import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../api';

interface WalletData {
  balance: number;
  pending_amount: number;
  total_earned: number;
  total_withdrawn: number;
}

interface Transaction {
  id: number;
  type: 'credit' | 'debit' | 'pending';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  expected_release_at?: string;
  time_until_release?: string;
  created_at: string;
}

export default function WalletScreen() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [walletRes, transactionsRes] = await Promise.all([
        API.get('/doctor/wallet'),
        API.get('/doctor/wallet/transactions')
      ]);

      setWallet(walletRes.data.wallet);
      setTransactions(transactionsRes.data.transactions);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return 'schedule';
    return type === 'credit' ? 'arrow-downward' : 'arrow-upward';
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'pending') return '#F59E0B';
    return type === 'credit' ? '#10B981' : '#EF4444';
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
        <ThemedView style={styles.container}>
          <ThemedText>Loading wallet...</ThemedText>
        </ThemedView>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PrimaryColors.main]} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[PrimaryColors.main, PrimaryColors.lighter]}
          style={styles.header}
        >
          <ThemedText style={styles.headerTitle}>My Wallet</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Track your earnings</ThemedText>
        </LinearGradient>

        {/* Balance Cards */}
        <View style={styles.cardsContainer}>
          {/* Available Balance */}
          <View style={[styles.balanceCard, styles.primaryCard]}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#FFFFFF" />
              <ThemedText style={styles.cardLabel}>Available Balance</ThemedText>
            </View>
            <ThemedText style={styles.balanceAmount}>
              ₹{wallet?.balance ? Number(wallet.balance).toFixed(2) : '0.00'}
            </ThemedText>
            <TouchableOpacity style={styles.withdrawButton}>
              <ThemedText style={styles.withdrawButtonText}>Withdraw</ThemedText>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Pending Amount - Trust Building */}
          {wallet && wallet.pending_amount > 0 && (
            <View style={[styles.balanceCard, styles.pendingCard]}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="schedule" size={24} color="#F59E0B" />
                <ThemedText style={styles.pendingCardLabel}>Pending Approval</ThemedText>
              </View>
              <ThemedText style={styles.pendingAmount}>
                ₹{Number(wallet.pending_amount).toFixed(2)}
              </ThemedText>
              <View style={styles.pendingInfo}>
                <MaterialIcons name="info-outline" size={16} color="#64748B" />
                <ThemedText style={styles.pendingInfoText}>
                  Will be credited after job approval + 30 min
                </ThemedText>
              </View>
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Total Earned</ThemedText>
              <ThemedText style={styles.statValue}>
                ₹{wallet?.total_earned ? Number(wallet.total_earned).toFixed(2) : '0.00'}
              </ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Total Withdrawn</ThemedText>
              <ThemedText style={styles.statValue}>
                ₹{wallet?.total_withdrawn ? Number(wallet.total_withdrawn).toFixed(2) : '0.00'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <ThemedText style={styles.sectionTitle}>Recent Transactions</ThemedText>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={64} color={NeutralColors.textSecondary} />
              <ThemedText style={styles.emptyText}>No transactions yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Complete jobs to start earning
              </ThemedText>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: getTransactionColor(transaction.type, transaction.status) + '20' }
                  ]}
                >
                  <MaterialIcons
                    name={getTransactionIcon(transaction.type, transaction.status)}
                    size={24}
                    color={getTransactionColor(transaction.type, transaction.status)}
                  />
                </View>

                <View style={styles.transactionDetails}>
                  <ThemedText style={styles.transactionDescription}>
                    {transaction.description}
                  </ThemedText>
                  
                  {transaction.status === 'pending' && transaction.time_until_release && (
                    <View style={styles.pendingBadge}>
                      <MaterialIcons name="schedule" size={12} color="#F59E0B" />
                      <ThemedText style={styles.pendingBadgeText}>
                        Releasing in {transaction.time_until_release}
                      </ThemedText>
                    </View>
                  )}
                  
                  <ThemedText style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </ThemedText>
                </View>

                <View style={styles.transactionAmount}>
                  <ThemedText
                    style={[
                      styles.amountText,
                      {
                        color: transaction.status === 'pending' 
                          ? '#F59E0B' 
                          : transaction.type === 'credit' 
                          ? '#10B981' 
                          : '#EF4444'
                      }
                    ]}
                  >
                    {transaction.type === 'debit' ? '-' : '+'}₹{Number(transaction.amount).toFixed(2)}
                  </ThemedText>
                  {transaction.status === 'pending' && (
                    <ThemedText style={styles.statusBadge}>Pending</ThemedText>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  cardsContainer: {
    padding: 20,
    marginTop: -20,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryCard: {
    backgroundColor: PrimaryColors.main,
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FEF3C7',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
    fontWeight: '600',
  },
  pendingCardLabel: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  pendingAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 12,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginRight: 6,
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  pendingInfoText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.darkText,
  },
  transactionsSection: {
    padding: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.darkText,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: PrimaryColors.darkText,
    marginBottom: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    color: '#92400E',
    marginLeft: 4,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 10,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
});
