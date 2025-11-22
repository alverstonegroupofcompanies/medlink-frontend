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
} from 'react-native';
import { router } from 'expo-router';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Wallet,
  DollarSign,
  ArrowRight,
} from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors, DoctorStatusColors as StatusColors } from '@/constants/doctor-theme';
import API from '../api';
import * as Location from 'expo-location';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await API.get('/doctor/sessions');
      setSessions(response.data.sessions || []);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load job sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCheckIn = async (sessionId: number, hospitalLat: number, hospitalLng: number) => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required for check-in');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Calculate distance (simple haversine - you can improve this)
      const distance = calculateDistance(latitude, longitude, hospitalLat, hospitalLng);
      
      if (distance > 0.1) { // More than 100m away
        Alert.alert(
          'Too Far Away',
          `You are ${Math.round(distance * 1000)}m away from the hospital. Please move closer to check in.`
        );
        return;
      }

      // Check in with GPS
      const response = await API.post('/doctor/attendance/check-in', {
        job_session_id: sessionId,
        method: 'gps',
        latitude,
        longitude,
      });

      Alert.alert('Success', 'Checked in successfully!');
      loadSessions();
    } catch (error: any) {
      console.error('Check-in error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async (sessionId: number, hospitalLat: number, hospitalLng: number) => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required for check-out');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Check out with GPS
      const response = await API.post('/doctor/attendance/check-out', {
        job_session_id: sessionId,
        method: 'gps',
        latitude,
        longitude,
      });

      Alert.alert('Success', 'Checked out successfully!');
      loadSessions();
    } catch (error: any) {
      console.error('Check-out error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to check out');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return StatusColors.success;
      case 'in_progress':
        return StatusColors.warning;
      case 'scheduled':
        return PrimaryColors.main;
      case 'cancelled':
        return StatusColors.error;
      default:
        return NeutralColors.textTertiary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'scheduled':
        return 'Scheduled';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'released':
        return StatusColors.success;
      case 'in_escrow':
        return StatusColors.warning;
      case 'pending':
        return NeutralColors.textTertiary;
      default:
        return StatusColors.error;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Job Sessions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Job Sessions</Text>
        <TouchableOpacity
          style={styles.walletButton}
          onPress={() => router.push('/doctor/wallet')}
        >
          <Wallet size={20} color="#fff" />
          <Text style={styles.walletButtonText}>Wallet</Text>
        </TouchableOpacity>
      </View>

      {/* Sessions List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadSessions} />
        }
      >
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={NeutralColors.textTertiary} />
            <Text style={styles.emptyText}>No job sessions yet</Text>
            <Text style={styles.emptySubtext}>When hospitals approve your applications, they will appear here</Text>
          </View>
        ) : (
          sessions.map((session) => {
            const hasCheckedIn = session.check_in_time || session.attendance?.check_in_time;
            const hasCheckedOut = session.attendance?.check_out_time;
            const canCheckIn = session.status === 'scheduled' && !hasCheckedIn;
            const canCheckOut = hasCheckedIn && !hasCheckedOut;
            const hospital = session.job_requirement?.hospital || session.jobRequirement?.hospital;

            return (
              <View key={session.id} style={styles.sessionCard}>
                {/* Header */}
                <View style={styles.sessionHeader}>
                  <View style={styles.hospitalInfo}>
                    <Building2 size={20} color={PrimaryColors.main} />
                    <Text style={styles.hospitalName}>{hospital?.name || 'Hospital'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(session.status) }]}>
                      {getStatusText(session.status)}
                    </Text>
                  </View>
                </View>

                {/* Date & Time */}
                <View style={styles.detailRow}>
                  <Calendar size={16} color={NeutralColors.textSecondary} />
                  <Text style={styles.detailText}>
                    {new Date(session.session_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  {session.start_time && (
                    <>
                      <Clock size={16} color={NeutralColors.textSecondary} style={styles.clockIcon} />
                      <Text style={styles.detailText}>
                        {new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {session.end_time && ` - ${new Date(`2000-01-01 ${session.end_time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}`}
                      </Text>
                    </>
                  )}
                </View>

                {/* Location */}
                {hospital?.address && (
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={NeutralColors.textSecondary} />
                    <Text style={styles.detailText} numberOfLines={2}>{hospital.address}</Text>
                  </View>
                )}

                {/* Payment Info */}
                <View style={styles.paymentRow}>
                  <View style={styles.paymentInfo}>
                    <DollarSign size={16} color={PrimaryColors.main} />
                    <Text style={styles.paymentAmount}>₹{parseFloat(session.payment_amount || 0).toFixed(2)}</Text>
                  </View>
                  {session.payments && session.payments.length > 0 && (
                    <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(session.payments[0].status) + '20' }]}>
                      <Text style={[styles.paymentStatusText, { color: getPaymentStatusColor(session.payments[0].status) }]}>
                        {session.payments[0].status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Attendance Status */}
                {hasCheckedIn && (
                  <View style={styles.attendanceRow}>
                    <CheckCircle size={16} color={StatusColors.success} />
                    <Text style={styles.attendanceText}>
                      Checked in: {new Date(session.check_in_time || session.attendance?.check_in_time).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
                {hasCheckedOut && (
                  <View style={styles.attendanceRow}>
                    <CheckCircle size={16} color={StatusColors.success} />
                    <Text style={styles.attendanceText}>
                      Checked out: {new Date(session.attendance.check_out_time).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
                {/* Show session status if checked in */}
                {session.check_in_time && session.status === 'in_progress' && (
                  <View style={styles.attendanceRow}>
                    <Clock size={16} color={StatusColors.warning} />
                    <Text style={[styles.attendanceText, { color: StatusColors.warning }]}>
                      Work in progress
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {canCheckIn && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.checkInButton]}
                      onPress={() => handleCheckIn(session.id, hospital?.latitude, hospital?.longitude)}
                    >
                      <LogIn size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Check In</Text>
                    </TouchableOpacity>
                  )}
                  {canCheckOut && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.checkOutButton]}
                      onPress={() => handleCheckOut(session.id, hospital?.latitude, hospital?.longitude)}
                    >
                      <LogOut size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Check Out</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.detailsButton]}
                    onPress={() => router.push(`/(tabs)/job-session/${session.id}`)}
                  >
                    <Text style={[styles.actionButtonText, { color: PrimaryColors.main }]}>View Session</Text>
                    <ArrowRight size={16} color={PrimaryColors.main} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PrimaryColors.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: PrimaryColors.dark,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PrimaryColors.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  walletButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: NeutralColors.textSecondary,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hospitalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  clockIcon: {
    marginLeft: 12,
  },
  detailText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    flex: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: StatusColors.success + '10',
    padding: 8,
    borderRadius: 8,
  },
  attendanceText: {
    fontSize: 13,
    color: StatusColors.success,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkInButton: {
    backgroundColor: StatusColors.success,
  },
  checkOutButton: {
    backgroundColor: StatusColors.warning,
  },
  detailsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: PrimaryColors.main,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
