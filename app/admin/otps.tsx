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
  Alert,
  RefreshControl,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { ArrowLeft, Search, Mail, CheckCircle, XCircle, Clock, Send, Filter, RefreshCw } from 'lucide-react-native';

export default function OTPManagement() {
  const router = useRouter();
  const [otps, setOtps] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, doctor, hospital
  const [filterVerified, setFilterVerified] = useState('all'); // all, verified, unverified
  const [filterExpired, setFilterExpired] = useState('all'); // all, expired, active
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendType, setSendType] = useState('doctor');
  const [sending, setSending] = useState(false);
  const [pagination, setPagination] = useState<any>({});

  useEffect(() => {
    loadOTPs();
    loadStats();
    checkAuth();
  }, [filterType, filterVerified, filterExpired]);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  };

  const loadOTPs = async (page = 1) => {
    try {
      setLoading(page === 1);
      const token = await AsyncStorage.getItem('admin_token');
      const params: any = {
        page,
        per_page: 20,
      };

      if (searchQuery) params.email = searchQuery;
      if (filterType !== 'all') params.type = filterType;
      if (filterVerified !== 'all') params.verified = filterVerified === 'verified';
      if (filterExpired !== 'all') params.expired = filterExpired === 'expired';

      const response = await axios.get(`${API_BASE_URL}/admin/otps`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (response.data.status) {
        if (page === 1) {
          setOtps(response.data.otps.data || []);
        } else {
          setOtps([...otps, ...(response.data.otps.data || [])]);
        }
        setPagination(response.data.otps);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load OTPs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE_URL}/admin/otps/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSendOTP = async () => {
    if (!sendEmail) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setSending(true);
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.post(
        `${API_BASE_URL}/admin/otps/send`,
        {
          email: sendEmail,
          type: sendType,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.status) {
        Alert.alert('Success', `OTP sent to ${sendEmail}\nOTP: ${response.data.otp.otp}`);
        setSendModalVisible(false);
        setSendEmail('');
        loadOTPs();
        loadStats();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOTP = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.post(
        `${API_BASE_URL}/admin/otps/${id}/verify`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.status) {
        Alert.alert('Success', 'OTP verified successfully');
        loadOTPs();
        loadStats();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to verify OTP');
    }
  };

  const handleDeleteOTP = async (id: number, email: string) => {
    Alert.alert('Delete OTP', `Are you sure you want to delete OTP for ${email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('admin_token');
            await axios.delete(`${API_BASE_URL}/admin/otps/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            Alert.alert('Success', 'OTP deleted successfully');
            loadOTPs();
            loadStats();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete OTP');
          }
        },
      },
    ]);
  };

  const filteredOTPs = otps.filter((otp) =>
    otp.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeRemaining = (minutes: number | null) => {
    if (minutes === null || minutes < 0) return 'Expired';
    if (minutes < 60) return `${Math.floor(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading && !otps.length) {
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
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OTP Management</Text>
        <TouchableOpacity
          onPress={() => setSendModalVisible(true)}
          style={styles.sendButton}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.verified}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.unverified}</Text>
            <Text style={styles.statLabel}>Unverified</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.expired}</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Type:</Text>
          <View style={styles.filterButtons}>
            {['all', 'doctor', 'hospital'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  filterType === type && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === type && styles.filterButtonTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {['all', 'verified', 'unverified'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterVerified === status && styles.filterButtonActive,
                ]}
                onPress={() => setFilterVerified(status)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterVerified === status && styles.filterButtonTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Expiry:</Text>
          <View style={styles.filterButtons}>
            {['all', 'expired', 'active'].map((exp) => (
              <TouchableOpacity
                key={exp}
                style={[
                  styles.filterButton,
                  filterExpired === exp && styles.filterButtonActive,
                ]}
                onPress={() => setFilterExpired(exp)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterExpired === exp && styles.filterButtonTextActive,
                  ]}
                >
                  {exp.charAt(0).toUpperCase() + exp.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadOTPs()} />
        }
      >
        {filteredOTPs.map((otp) => (
          <View key={otp.id} style={styles.otpCard}>
            <View style={styles.otpHeader}>
              <View style={styles.otpInfo}>
                <Mail size={16} color="#6b7280" />
                <Text style={styles.otpEmail}>{otp.email}</Text>
                <View
                  style={[
                    styles.typeBadge,
                    otp.type === 'doctor' ? styles.typeDoctor : styles.typeHospital,
                  ]}
                >
                  <Text style={styles.typeText}>{otp.type}</Text>
                </View>
              </View>
              {otp.verified ? (
                <CheckCircle size={20} color="#10b981" />
              ) : (
                <XCircle size={20} color="#ef4444" />
              )}
            </View>

            <View style={styles.otpDetails}>
              <View style={styles.otpRow}>
                <Text style={styles.otpLabel}>OTP:</Text>
                <Text style={styles.otpValue}>{otp.otp}</Text>
              </View>
              <View style={styles.otpRow}>
                <Text style={styles.otpLabel}>Status:</Text>
                <Text
                  style={[
                    styles.otpStatus,
                    otp.verified ? styles.statusVerified : styles.statusUnverified,
                  ]}
                >
                  {otp.verified ? 'Verified' : 'Unverified'}
                </Text>
              </View>
              <View style={styles.otpRow}>
                <Text style={styles.otpLabel}>Expires:</Text>
                <Text
                  style={[
                    styles.otpExpiry,
                    otp.is_expired ? styles.expired : styles.active,
                  ]}
                >
                  {otp.is_expired
                    ? 'Expired'
                    : formatTimeRemaining(otp.time_remaining)}
                </Text>
              </View>
              <View style={styles.otpRow}>
                <Text style={styles.otpLabel}>Created:</Text>
                <Text style={styles.otpDate}>
                  {new Date(otp.created_at).toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.otpActions}>
              {!otp.verified && !otp.is_expired && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleVerifyOTP(otp.id)}
                >
                  <CheckCircle size={16} color="#10b981" />
                  <Text style={styles.actionButtonText}>Verify</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteOTP(otp.id, otp.email)}
              >
                <XCircle size={16} color="#ef4444" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {pagination.current_page < pagination.last_page && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => loadOTPs(pagination.current_page + 1)}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}

        {filteredOTPs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No OTPs found</Text>
          </View>
        )}
      </ScrollView>

      {/* Send OTP Modal */}
      <Modal
        visible={sendModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSendModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send OTP</Text>

            <Text style={styles.modalLabel}>Email Address</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter email"
              value={sendEmail}
              onChangeText={setSendEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.modalTypeButtons}>
              {['doctor', 'hospital'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.modalTypeButton,
                    sendType === type && styles.modalTypeButtonActive,
                  ]}
                  onPress={() => setSendType(type)}
                >
                  <Text
                    style={[
                      styles.modalTypeButtonText,
                      sendType === type && styles.modalTypeButtonTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setSendModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSend]}
                onPress={handleSendOTP}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonSendText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 16 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: 8,
  },
  sendButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1e293b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  otpCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  otpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  otpEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  typeDoctor: {
    backgroundColor: '#dbeafe',
  },
  typeHospital: {
    backgroundColor: '#dcfce7',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  otpDetails: {
    marginBottom: 12,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  otpLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  otpValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  otpStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusVerified: {
    color: '#10b981',
  },
  statusUnverified: {
    color: '#ef4444',
  },
  otpExpiry: {
    fontSize: 14,
    fontWeight: '600',
  },
  expired: {
    color: '#ef4444',
  },
  active: {
    color: '#10b981',
  },
  otpDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  otpActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
  },
  modalTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  modalTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  modalTypeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  modalTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalTypeButtonTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonSend: {
    backgroundColor: '#2563eb',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonSendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

