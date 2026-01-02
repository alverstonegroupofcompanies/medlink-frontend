import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CreditCard, Calendar, User, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import API from '../api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    try {
      const response = await API.get('/hospital/payments');
      setPayments(response.data.payments.data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
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
      case 'released': return '#16A34A'; // Green
      case 'in_escrow': return '#F59E0B'; // Amber
      case 'refunded': return '#DC2626'; // Red
      default: return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'released': return 'Paid';
      case 'in_escrow': return 'In Escrow';
      case 'refunded': return 'Refunded';
      default: return status.replace('_', ' ');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.doctorInfoContainer}>
            <View style={[styles.avatar, { backgroundColor: PrimaryColors.main + '10' }]}>
               <User size={20} color={PrimaryColors.main} />
            </View>
            <View>
                <Text style={styles.doctorName}>Dr. {item.doctor?.name || 'Unknown'}</Text>
                <Text style={styles.sessionInfo}>Session #{item.job_session_id} • {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
        </View>
        <Text style={styles.amountValue}>₹{item.amount}</Text>
      </View>

      <View style={styles.cardBottomRow}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
            </Text>
        </View>
        <Text style={styles.paymentMethod}>{item.payment_method?.replace('_', ' ').toUpperCase() || 'WALLET'}</Text>
      </View>
    </View>
  );

  return (
    <ScreenSafeArea style={styles.container} backgroundColor={PrimaryColors.main}>
      <StatusBar style="light" backgroundColor={PrimaryColors.main} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.contentContainer}>
        {loading ? (
            <View style={styles.center}>
            <ActivityIndicator size="large" color={PrimaryColors.main} />
            </View>
        ) : (
            <FlatList
            data={payments}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                <CreditCard size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No payments found</Text>
                </View>
            }
            />
        )}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PrimaryColors.main,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: PrimaryColors.main,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  backBtn: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    // Removed
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  doctorInfo: {
     // Removed
  },
  doctorInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
  },
  avatar: {
      width: 40, 
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
  },
  doctorName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 2,
  },
  sessionInfo: {
      fontSize: 12,
      color: '#64748B',
  },
  date: {
      // Removed
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
  },
  statusText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  divider: {
      // Removed
  },
  amountRow: {
      // Removed
  },
  amountLabel: {
      // Removed
  },
  amountValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#0F172A',
  },
  detailsRow: {
      // Removed
  },
  sessionId: {
      // Removed
  },
  paymentMethod: {
      fontSize: 11,
      color: '#94A3B8',
      fontWeight: '500',
  },
  emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
  },
  emptyText: {
      marginTop: 16,
      color: '#64748B',
      fontSize: 16,
  },
});
