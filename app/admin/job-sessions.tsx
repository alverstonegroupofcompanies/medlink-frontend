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
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, User, Building2, PlayCircle } from 'lucide-react-native';

export default function AdminJobSessions() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any>({
    all: [],
    scheduled: [],
    in_progress: [],
    completed: [],
    cancelled: [],
  });
  const [counts, setCounts] = useState<any>({
    total: 0,
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    loadSessions();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE_URL}/admin/job-sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status) {
        setSessions(response.data.sessions);
        setCounts(response.data.counts);
      }
    } catch (error) {
      console.error('Error loading job sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color="#10b981" />;
      case 'cancelled':
        return <XCircle size={20} color="#ef4444" />;
      case 'in_progress':
        return <PlayCircle size={20} color="#3b82f6" />;
      default:
        return <Clock size={20} color="#f59e0b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      case 'in_progress':
        return '#3b82f6';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Scheduled';
    }
  };

  const formatDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  const currentSessions = sessions[activeTab] || [];

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
        <Text style={styles.headerTitle}>Job Sessions</Text>
        <View style={{ width: 40 }} />
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
          style={[styles.tab, activeTab === 'scheduled' && styles.tabActive]}
          onPress={() => setActiveTab('scheduled')}
        >
          <Text style={[styles.tabText, activeTab === 'scheduled' && styles.tabTextActive]}>
            Scheduled ({counts.scheduled})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'in_progress' && styles.tabActive]}
          onPress={() => setActiveTab('in_progress')}
        >
          <Text style={[styles.tabText, activeTab === 'in_progress' && styles.tabTextActive]}>
            Active ({counts.in_progress})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed ({counts.completed})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadSessions} />
        }
      >
        {currentSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No job sessions found</Text>
          </View>
        ) : (
          currentSessions.map((session: any) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionInfo}>
                  <Calendar size={20} color="#2563eb" />
                  <View style={styles.infoText}>
                    <Text style={styles.sessionId}>Session #{session.id}</Text>
                    <Text style={styles.department}>
                      {session.job_requirement?.department || 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(session.status)}15` }]}>
                  {getStatusIcon(session.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(session.status) }]}>
                    {getStatusText(session.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.participantsSection}>
                {session.doctor && (
                  <View style={styles.participantRow}>
                    <User size={16} color="#64748b" />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantLabel}>Doctor:</Text>
                      <Text style={styles.participantName}>{session.doctor.name}</Text>
                      <Text style={styles.participantEmail}>{session.doctor.email}</Text>
                    </View>
                  </View>
                )}

                {session.job_requirement?.hospital && (
                  <View style={styles.participantRow}>
                    <Building2 size={16} color="#64748b" />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantLabel}>Hospital:</Text>
                      <Text style={styles.participantName}>
                        {session.job_requirement.hospital.name}
                      </Text>
                      <Text style={styles.participantEmail}>
                        {session.job_requirement.hospital.email}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {session.check_in_time && (
                <View style={styles.timeSection}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Check-in:</Text>
                    <Text style={styles.timeValue}>
                      {new Date(session.check_in_time).toLocaleString()}
                    </Text>
                  </View>
                  {session.check_in_verified && (
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  )}
                </View>
              )}

              {session.start_time && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Start Time:</Text>
                  <Text style={styles.timeValue}>
                    {new Date(session.start_time).toLocaleString()}
                  </Text>
                </View>
              )}

              {session.end_time && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>End Time:</Text>
                  <Text style={styles.timeValue}>
                    {new Date(session.end_time).toLocaleString()}
                  </Text>
                </View>
              )}

              {session.start_time && session.end_time && (
                <View style={styles.durationRow}>
                  <Text style={styles.durationLabel}>Duration:</Text>
                  <Text style={styles.durationValue}>
                    {formatDuration(session.start_time, session.end_time)}
                  </Text>
                </View>
              )}

              {session.payment && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Payment:</Text>
                  <Text style={styles.paymentValue}>
                    ₹{typeof session.payment.amount === 'number' 
                      ? session.payment.amount.toFixed(2) 
                      : parseFloat(session.payment.amount || '0').toFixed(2)}
                  </Text>
                  <Text style={[styles.paymentStatus, { color: getStatusColor(session.payment.status) }]}>
                    ({session.payment.status})
                  </Text>
                </View>
              )}

              <Text style={styles.createdDate}>
                Created: {new Date(session.created_at).toLocaleDateString()}
              </Text>
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
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
    letterSpacing: -0.5,
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
      ios: 'Inter-Medium', 
      android: 'Inter-Medium',
      default: 'Inter-Medium'
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
    fontFamily: Platform.select({ 
      ios: 'Inter-Regular', 
      android: 'Inter-Regular',
      default: 'Inter-Regular'
    }),
  },
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sessionInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  infoText: {
    flex: 1,
  },
  sessionId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  department: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: Platform.select({ 
      ios: 'Inter-Regular', 
      android: 'Inter-Regular',
      default: 'Inter-Regular'
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
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  participantsSection: {
    gap: 12,
    marginBottom: 12,
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
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  participantEmail: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: Platform.select({ 
      ios: 'Inter-Regular', 
      android: 'Inter-Regular',
      default: 'Inter-Regular'
    }),
  },
  timeSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: Platform.select({ 
      ios: 'Inter-Regular', 
      android: 'Inter-Regular',
      default: 'Inter-Regular'
    }),
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  verifiedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 4,
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: Platform.select({ 
      ios: 'Inter-Regular', 
      android: 'Inter-Regular',
      default: 'Inter-Regular'
    }),
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  createdDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontFamily: Platform.select({ 
      ios: 'Inter-Regular', 
      android: 'Inter-Regular',
      default: 'Inter-Regular'
    }),
  },
});

