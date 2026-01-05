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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'released': return <CheckCircle size={14} color="#16A34A" />;
      case 'in_escrow': return <Clock size={14} color="#F59E0B" />;
      case 'refunded': return <AlertCircle size={14} color="#DC2626" />;
      default: return <AlertCircle size={14} color="#64748B" />;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={styles.iconContainer}>
            {item.doctor?.profile_photo ? (
                // Use Image if available, or just an icon
                <User size={24} color={PrimaryColors.main} />
            ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#EFF6FF' }]}>
                    <User size={20} color={PrimaryColors.main} />
                </View>
            )}
        </View>
        <View style={styles.infoContainer}>
            <Text style={styles.merchantName} numberOfLines={1}>Dr. {item.doctor?.name || 'Unknown Doctor'}</Text>
            <Text style={styles.transactionDate}>{new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <View style={styles.subInfoRow}>
                 {getStatusIcon(item.status)}
                 <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusLabel(item.status)}
                 </Text>
            </View>
        </View>
      </View>
      
      <View style={styles.transactionRight}>
        <Text style={styles.amountText}>- ₹{item.amount}</Text>
        <Text style={styles.paymentMethodText}>{item.payment_method?.replace('_', ' ').toUpperCase() || 'WALLET'}</Text>
      </View>
    </View>
  );

  return (
    <ScreenSafeArea style={styles.container} backgroundColor="#fff">
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0F172A" />
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
    backgroundColor: '#fff', // White background for the whole screen
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10, // Adjusted for safe area
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // New Transaction Item Styles
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align to top
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  transactionLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
     marginTop: 2,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8, // Square-ish rounded
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    justifyContent: 'space-between',
    gap: 4,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748B',
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentMethodText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  emptyContainer: {
      alignItems: 'center',
      paddingTop: 100,
  },
  emptyText: {
      marginTop: 16,
      color: '#94A3B8',
      fontSize: 16,
      fontWeight: '500',
  },
});
