import React, { useState } from 'react';
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
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, AlertCircle, MessageCircle, Calendar, FileText } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import API from '../api';

export default function HospitalDisputesListScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const safeBottomPadding = useSafeBottomPadding();

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(PrimaryColors.main, true);
        StatusBar.setTranslucent(false);
        StatusBar.setBarStyle('light-content', true);
      }
      StatusBar.setBarStyle('light-content', true);
      loadDisputes();
      return () => {};
    }, [sessionId])
  );

  const loadDisputes = async () => {
    try {
      // Filter by session if sessionId is provided
      const url = sessionId ? `/disputes?job_session_id=${sessionId}` : '/disputes';
      const response = await API.get(url);
      setDisputes(response.data.disputes || []);
    } catch (error: any) {
      // Suppress 401 errors - API interceptor handles them
      if (error.response?.status !== 401) {
        if (__DEV__) {
          console.error('Error loading disputes:', error);
        }
        Alert.alert('Error', error.response?.data?.message || 'Failed to load disputes');
      }
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
        return { bg: '#DCFCE7', text: '#15803D', icon: '✓' };
      case 'closed':
        return { bg: '#F3F4F6', text: '#6B7280', icon: '○' };
      case 'under_review':
        return { bg: '#FEF3C7', text: '#D97706', icon: '⏳' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#DC2626', icon: '✗' };
      default:
        return { bg: '#DBEAFE', text: '#1E40AF', icon: '●' };
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

  const getDisputeTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return '💳';
      case 'attendance': return '📅';
      case 'quality': return '⭐';
      default: return '📋';
    }
  };

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.main} statusBarStyle="light-content" style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.main} translucent={false} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Disputes</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottomPadding + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {disputes.length === 0 ? (
            <View style={styles.empty}>
              <AlertCircle size={64} color={NeutralColors.textLight} />
              <Text style={styles.emptyTitle}>No Disputes</Text>
              <Text style={styles.emptyText}>
                You haven't raised any disputes yet.{'\n'}
                Disputes you create will appear here.
              </Text>
            </View>
          ) : (
            disputes.map((d: any) => {
              const statusStyle = getStatusStyle(d.status);
              const messageCount = d.messages?.length || 0;
              const disputeTypeIcon = getDisputeTypeIcon(d.dispute_type);
              
              return (
                <TouchableOpacity
                  key={d.id}
                  style={styles.card}
                  onPress={() => router.push(`/hospital/dispute/detail/${d.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                      <Text style={styles.cardTypeIcon}>{disputeTypeIcon}</Text>
                      <Text style={styles.cardTitle} numberOfLines={2}>{d.title}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {statusStyle.icon} {getStatusLabel(d.status)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardBody}>
                    <View style={styles.cardRow}>
                      <FileText size={14} color={NeutralColors.textSecondary} />
                      <Text style={styles.cardType}>
                        {d.dispute_type ? d.dispute_type.charAt(0).toUpperCase() + d.dispute_type.slice(1) : 'Other'}
                      </Text>
                    </View>
                    
                    <View style={styles.cardRow}>
                      <Calendar size={14} color={NeutralColors.textSecondary} />
                      <Text style={styles.cardDate}>
                        {d.created_at
                          ? new Date(d.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </Text>
                    </View>
                    
                    {messageCount > 0 && (
                      <View style={styles.cardRow}>
                        <MessageCircle size={14} color={PrimaryColors.main} />
                        <Text style={styles.msgCount}>
                          {messageCount} message{messageCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {d.jobSession && (
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionText}>
                        Session #{d.jobSession.id} • {d.jobSession.job?.title || 'Job Session'}
                      </Text>
                    </View>
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
    backgroundColor: PrimaryColors.main,
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
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTypeIcon: {
    fontSize: 20,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: 8,
    marginTop: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardType: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  cardDate: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
  },
  msgCount: {
    fontSize: 13,
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  sessionInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sessionText: {
    fontSize: 12,
    color: NeutralColors.textLight,
    fontStyle: 'italic',
  },
});
