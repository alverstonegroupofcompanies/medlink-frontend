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
      <View style={styles.cardHeader}>
        <View style={styles.doctorInfo}>
            <View style={styles.avatar}>
               <User size={20} color="#64748B" />
            </View>
            <View>
                <Text style={styles.doctorName}>Dr. {item.doctor?.name || 'Unknown Doctor'}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
            </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Amount Paid</Text>
        <Text style={styles.amountValue}>₹{item.amount}</Text>
      </View>

      <View style={styles.detailsRow}>
         <Text style={styles.sessionId}>Session #{item.job_session_id}</Text>
         <Text style={styles.paymentMethod}>{item.payment_method ? item.payment_method.replace('_', ' ').toUpperCase() : 'WALLET'}</Text>
      </View>
    </View>
  );

  return (
    <ScreenSafeArea style={styles.container}>
      <StatusBar style="dark" backgroundColor="#fff" />
      
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
    paddingTop: 20, // Adjusted since ScreenSafeArea handles top inset? No, usually header needs padding inside SafeArea
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
  },
  date: {
      fontSize: 12,
      color: '#64748B',
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
  },
  statusText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'capitalize',
  },
  divider: {
      height: 1,
      backgroundColor: '#F1F5F9',
      marginVertical: 12,
  },
  amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  amountLabel: {
      fontSize: 14,
      color: '#64748B',
  },
  amountValue: {
      fontSize: 18,
      fontWeight: '700',
      color: '#0F172A',
  },
  detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  sessionId: {
      fontSize: 12,
      color: '#94A3B8',
  },
  paymentMethod: {
      fontSize: 12,
      color: '#64748B',
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
