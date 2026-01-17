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
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  CheckCircle,
  XCircle,
  LogIn,
  Wallet,
  DollarSign,
  ArrowRight,
  AlertCircle,
} from 'lucide-react-native';
import { Image } from 'react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors, DoctorStatusColors as StatusColors } from '@/constants/doctor-theme';
import { ModernColors } from '@/constants/modern-theme';
import { useSafeBottomPadding } from '@/components/screen-safe-area';
import API from '../api';
import * as Location from 'expo-location';
import { BASE_BACKEND_URL } from '@/config/api';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const safeBottomPadding = useSafeBottomPadding();

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

  const getDerivedStatus = (session: any) => {
    if (session.status === 'cancelled') return 'cancelled';
    if (session.status === 'completed') return 'completed';
    // If checked in, it's effectively in progress or completed
    if (session.check_in_time || session.attendance?.check_in_time) {
        return session.status === 'completed' ? 'completed' : 'in_progress';
    }
    
    // Check if missed (scheduled but time passed)
    if (session.status === 'scheduled') {
      const sessionDateStr = session.session_date; // YYYY-MM-DD
      const startTimeStr = session.start_time; // HH:mm:ss
      
      const sessionStart = new Date(`${sessionDateStr}T${startTimeStr}`);
      const now = new Date();
      
      // If session start time is more than 30 mins in the past and no check-in
      // (Using 30 mins buffer as reasonable grace period before marking "Not Attended")
      if (now.getTime() > sessionStart.getTime() + (30 * 60 * 1000)) {
        return 'missed';
      }
    }
    
    return session.status;
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
      case 'missed':
        return '#EF4444'; // Red for missed
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
      case 'missed':
        return 'Not Attended';
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
        <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
        <LinearGradient
            colors={ModernColors.primary.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
        >
          <Text style={styles.headerTitle}>Job History</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
      
      {/* Header */}
      <LinearGradient
          colors={ModernColors.primary.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
      >
        <Text style={styles.headerTitle}>Job History</Text>
        <TouchableOpacity
          style={styles.walletButton}
          onPress={() => router.push('/doctor/wallet' as any)}
        >
          <Wallet size={18} color={PrimaryColors.main} />
          <Text style={styles.walletButtonText}>Wallet</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Sessions List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
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
            const status = getDerivedStatus(session);

            return (
              <View key={session.id} style={styles.sessionCard}>
                {/* Header with Hospital Logo */}
                <View style={styles.sessionHeader}>
                  <View style={styles.hospitalInfo}>
                    {hospital?.logo_url || hospital?.logo_path ? (
                      <Image
                        source={{
                          uri: hospital.logo_url || `${BASE_BACKEND_URL}/app/${hospital.logo_path}`,
                        }}
                        style={styles.hospitalLogo}
                        onError={() => {
                          // Silently handle image load errors
                        }}
                      />
                    ) : (
                      <View style={styles.hospitalIconContainer}>
                        <Building2 size={20} color={PrimaryColors.main} />
                      </View>
                    )}
                    <View style={styles.hospitalTextContainer}>
                      <Text style={styles.hospitalName}>{hospital?.name || 'Hospital'}</Text>
                      <View style={styles.statusBadgeContainer}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                          {getStatusText(status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Calendar size={16} color={NeutralColors.textSecondary} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailText}>
                        {new Date(session.session_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  
                  {session.start_time && (
                    <View style={styles.detailItem}>
                      <Clock size={16} color={NeutralColors.textSecondary} />
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailText}>
                          {(() => {
                            try {
                              // Handle different time formats
                              let startTime = session.start_time;
                              if (typeof startTime === 'string') {
                                // If it's already in HH:mm format
                                if (startTime.match(/^\d{2}:\d{2}$/)) {
                                  const [hours, minutes] = startTime.split(':');
                                  const date = new Date();
                                  date.setHours(parseInt(hours), parseInt(minutes), 0);
                                  return date.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  });
                                }
                                // If it's a full datetime string
                                const startDate = new Date(startTime);
                                if (!isNaN(startDate.getTime())) {
                                  return startDate.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  });
                                }
                              }
                              return startTime || 'N/A';
                            } catch (e) {
                              return session.start_time || 'N/A';
                            }
                          })()}
                          {session.end_time && ` - ${(() => {
                            try {
                              let endTime = session.end_time;
                              if (typeof endTime === 'string') {
                                if (endTime.match(/^\d{2}:\d{2}$/)) {
                                  const [hours, minutes] = endTime.split(':');
                                  const date = new Date();
                                  date.setHours(parseInt(hours), parseInt(minutes), 0);
                                  return date.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  });
                                }
                                const endDate = new Date(endTime);
                                if (!isNaN(endDate.getTime())) {
                                  return endDate.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  });
                                }
                              }
                              return endTime || '';
                            } catch (e) {
                              return session.end_time || '';
                            }
                          })()}`}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {(session.job_requirement?.address || session.job_requirement?.latitude || hospital?.address) && (
                    <View style={[styles.detailItem, styles.detailItemFull]}>
                      <MapPin size={16} color={NeutralColors.textSecondary} />
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailLabel}>Location</Text>
                        <Text style={styles.detailText} numberOfLines={2}>
                          {session.job_requirement?.address || (session.job_requirement?.latitude ? "Custom Location" : hospital?.address)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Payment Status */}
                <View style={styles.paymentStatusRow}>
                  <View style={styles.paymentInfo}>
                    <DollarSign size={16} color={PrimaryColors.main} />
                    <View style={styles.paymentAmountContainer}>
                      <Text style={styles.paymentLabel}>Payment Amount</Text>
                      <Text style={styles.paymentAmount}>₹{parseFloat(session.payment_amount || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                  {session.payments && session.payments.length > 0 && (
                    <View style={[styles.paymentStatusBadge, { backgroundColor: `${getPaymentStatusColor(session.payments[0].payment_status || session.payments[0].status)}15` }]}>
                      <View style={[styles.paymentStatusDot, { backgroundColor: getPaymentStatusColor(session.payments[0].payment_status || session.payments[0].status) }]} />
                      <Text style={[styles.paymentStatusText, { color: getPaymentStatusColor(session.payments[0].payment_status || session.payments[0].status) }]}>
                        {(() => {
                          const paymentStatus = session.payments[0].payment_status || session.payments[0].status || 'pending';
                          return paymentStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                        })()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Attendance Status */}
                {(hasCheckedIn || hasCheckedOut) && (
                  <View style={styles.attendanceContainer}>
                    {hasCheckedIn && (
                      <View style={styles.attendanceItem}>
                        <LogIn size={14} color={StatusColors.success} />
                        <Text style={styles.attendanceLabel}>Check In:</Text>
                        <Text style={styles.attendanceText}>
                          {(() => {
                            try {
                              const checkInTime = session.check_in_time || session.attendance?.check_in_time;
                              if (checkInTime) {
                                const date = new Date(checkInTime);
                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  });
                                }
                              }
                              return 'N/A';
                            } catch (e) {
                              return 'N/A';
                            }
                          })()}
                        </Text>
                      </View>
                    )}
                    {hasCheckedOut && (
                      <View style={styles.attendanceItem}>
                        <LogIn size={14} color={StatusColors.success} style={{ transform: [{ rotate: '180deg' }] }} />
                        <Text style={styles.attendanceLabel}>Check Out:</Text>
                        <Text style={styles.attendanceText}>
                          {(() => {
                            try {
                              const checkOutTime = session.attendance?.check_out_time || session.check_out_time;
                              if (checkOutTime) {
                                const date = new Date(checkOutTime);
                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  });
                                }
                              }
                              return 'N/A';
                            } catch (e) {
                              return 'N/A';
                            }
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Action Button */}
                <View style={styles.actionButtons}>
                  {canCheckIn && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.checkInButton]}
                      onPress={() => handleCheckIn(
                        session.id, 
                        Number(session.job_requirement?.latitude || hospital?.latitude), 
                        Number(session.job_requirement?.longitude || hospital?.longitude)
                      )}
                    >
                      <LogIn size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Check In</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.detailsButton, !canCheckIn && styles.detailsButtonFull]}
                    onPress={() => {
                      if (session.application_id) {
                        router.push(`/job-detail/${session.application_id}`);
                      }
                    }}
                  >
                    <Text style={styles.detailsButtonText}>View Details</Text>
                    <ArrowRight size={16} color={PrimaryColors.main} />
                  </TouchableOpacity>
                </View>

                {/* Raise Dispute Button - Show for completed sessions */}
                {session.status === 'completed' && (
                  <TouchableOpacity
                    style={styles.disputeButton}
                    onPress={() => router.push(`/dispute/${session.id}` as any)}
                  >
                    <AlertCircle size={16} color={StatusColors.error} />
                    <Text style={styles.disputeButtonText}>Raise Dispute</Text>
                  </TouchableOpacity>
                )}
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50, // Adjusted padding for gradient header (safe area + spacing)
    paddingBottom: 20,
    // Removed backgroundColor and borderBottom styles as gradient handles them
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff', // White text
    letterSpacing: -0.3,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Translucent white for button on gradient
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  walletButtonText: {
    color: '#ffffff', // White text
    fontWeight: '600',
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    // paddingBottom is now set dynamically using safeBottomPadding
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
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sessionHeader: {
    marginBottom: 16,
  },
  hospitalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  hospitalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
  },
  hospitalTextContainer: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailItemFull: {
    width: '100%',
  },
  detailItemContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 20,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  paymentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentAmountContainer: {
    gap: 4,
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.main,
    letterSpacing: -0.5,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  attendanceContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginRight: 4,
  },
  attendanceText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
  },
  checkInButton: {
    backgroundColor: StatusColors.success,
  },
  checkOutButton: {
    backgroundColor: '#f59e0b',
  },
  detailsButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailsButtonFull: {
    flex: 1,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  detailsButtonText: {
    color: PrimaryColors.main,
    fontWeight: '600',
    fontSize: 13,
  },
});
