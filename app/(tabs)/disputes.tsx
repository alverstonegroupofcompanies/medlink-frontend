import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { ModernColors } from '@/constants/modern-theme';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import API from '../api';

export default function DoctorDisputesListScreen() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const safeBottomPadding = useSafeBottomPadding();

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(ModernColors.primary.main, true);
        StatusBar.setTranslucent(false);
        StatusBar.setBarStyle('light-content', true);
      }
      StatusBar.setBarStyle('light-content', true);
      loadDisputes();
      return () => {};
    }, [])
  );

  const loadDisputes = async () => {
    try {
      const response = await API.get('/disputes');
      setDisputes(response.data.disputes || []);
    } catch (error: any) {
      console.error('Error loading disputes:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load disputes');
      setDisputes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDisputes();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'closed':
        return { bg: '#F3F4F6', text: '#6B7280' };
      case 'under_review':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#FEF3C7', text: '#D97706' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      case 'under_review': return 'Under Review';
      case 'rejected': return 'Rejected';
      case 'open': return 'Open';
      default: return status || 'Open';
    }
  };

  return (
    <ScreenSafeArea backgroundColor={ModernColors.primary.main} statusBarStyle="light-content" style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ModernColors.primary.main} translucent={false} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Disputes</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ModernColors.primary.main} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottomPadding + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {disputes.length === 0 ? (
            <View style={styles.empty}>
              <AlertCircle size={48} color={ModernColors.neutral.gray400} />
              <Text style={styles.emptyTitle}>No disputes</Text>
              <Text style={styles.emptyText}>You don’t have any disputes yet.</Text>
            </View>
          ) : (
            disputes.map((d: any) => {
              const statusStyle = getStatusStyle(d.status);
              return (
                <TouchableOpacity
                  key={d.id}
                  style={styles.card}
                  onPress={() => router.push(`/(tabs)/dispute/detail/${d.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{d.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {getStatusLabel(d.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardType}>
                    Type: {d.dispute_type ? d.dispute_type.charAt(0).toUpperCase() + d.dispute_type.slice(1) : 'N/A'}
                  </Text>
                  <Text style={styles.cardDate}>
                    Created: {d.created_at
                      ? new Date(d.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </Text>
                  {d.messages && d.messages.length > 0 && (
                    <Text style={styles.msgCount}>
                      💬 {d.messages.length} message{d.messages.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: ModernColors.primary.main,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ModernColors.text.primary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: ModernColors.text.secondary,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: ModernColors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardType: {
    fontSize: 13,
    color: ModernColors.text.secondary,
    marginTop: 8,
  },
  cardDate: {
    fontSize: 12,
    color: ModernColors.text.secondary,
    marginTop: 4,
  },
  msgCount: {
    fontSize: 12,
    color: ModernColors.primary.main,
    marginTop: 8,
  },
});
