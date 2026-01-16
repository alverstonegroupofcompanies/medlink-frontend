import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Image,
  ActivityIndicator,
  StatusBar,
  DeviceEventEmitter,
  Animated,
} from 'react-native';
import { Card, Surface, Button, useTheme, Chip, Avatar, FAB } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Plus, MapPin, Building2, Clock, X, Navigation, Bell, LogOut, CreditCard, Users, CheckCircle2, FileText, XCircle, Calendar, User, DollarSign } from 'lucide-react-native';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { StatusBarHandler } from '@/components/StatusBarHandler';
import * as Location from 'expo-location';
import { DepartmentPicker } from '@/components/department-picker';
import { DatePicker } from '@/components/date-picker';
import { TimePicker } from '@/components/time-picker';
import { formatISTDateTime, formatISTDateOnly } from '@/utils/timezone';
import { getFullImageUrl } from '@/utils/url-helper';
import PromoCarousel from '@/components/promo-carousel';

// Import MapView - Metro will automatically resolve .web or .native based on platform
import { LocationPickerMap } from '@/components/LocationPickerMap';

// --- Memoized Components to Prevent Flickering ---

const RequirementItem = React.memo(({ req, onDelete }: { req: any, onDelete: (id: number) => void }) => {
  // Animation for press effect
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Calculate status based on applications
  const applications = req.applications || [];
  const selectedCount = applications.filter((app: any) => app.status === 'selected').length;
  const pendingCount = applications.filter((app: any) => app.status === 'pending' || !app.status).length;
  const rejectedCount = applications.filter((app: any) => app.status === 'rejected').length;
  const totalApplications = applications.length;

  // Determine overall status
  const getRequirementStatus = () => {
    if (req.is_expired) {
      return { text: 'Expired', color: StatusColors.error, icon: XCircle };
    }
    if (selectedCount > 0) {
      return { text: `${selectedCount} Selected`, color: StatusColors.success, icon: CheckCircle2 };
    }
    if (pendingCount > 0) {
      return { text: `${pendingCount} Pending`, color: StatusColors.warning, icon: Clock };
    }
    if (totalApplications === 0) {
      return { text: 'No Applications', color: NeutralColors.textTertiary, icon: Users };
    }
    return { text: 'Active', color: PrimaryColors.main, icon: Building2 };
  };

  const status = getRequirementStatus();
  const StatusIcon = status.icon;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start(() => {
      router.push({
        pathname: '/hospital/applications/[requirementId]',
        params: { requirementId: req.id.toString() }
      });
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View 
        style={[
          styles.requirementCard,
          selectedCount > 0 ? styles.requirementCardGreen :
          pendingCount > 0 ? styles.requirementCardYellow :
          req.is_expired ? styles.requirementCardRed :
          styles.requirementCardBlue,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.deptBadge}>
              <Building2 size={14} color={PrimaryColors.main} />
              <Text style={styles.deptText}>
                {req.department}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}15`, borderColor: status.color }]}>
              <StatusIcon size={12} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              onDelete(req.id);
            }}
            style={styles.deleteButton}
          >
            <X size={16} color={NeutralColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Compact Info Row */}
        <View style={styles.compactInfoRow}>
          <View style={styles.compactInfoItem}>
            <Clock size={14} color={NeutralColors.textSecondary} />
            <Text style={styles.compactInfoText} numberOfLines={1}>
              {req.work_type?.replace('-', ' ') || 'N/A'}
            </Text>
          </View>
          <View style={styles.compactInfoItem}>
            <Calendar size={14} color={NeutralColors.textSecondary} />
            <Text style={styles.compactInfoText} numberOfLines={1}>
              {req.required_sessions || 0} sessions
            </Text>
          </View>
        </View>

        {/* Work Date - Inline */}
        {req.work_required_date && (
          <View style={styles.compactDateRow}>
            <Calendar size={13} color={NeutralColors.textSecondary} />
            <Text style={styles.compactDateText} numberOfLines={1}>
              {formatISTDateOnly(req.work_required_date)}
              {req.start_time && ` • ${new Date(`2000-01-01 ${req.start_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
            </Text>
          </View>
        )}

        {/* Location - Inline */}
        {req.address && (
          <View style={styles.compactLocationRow}>
            <MapPin size={13} color={NeutralColors.textSecondary} />
            <Text style={styles.compactLocationText} numberOfLines={1} ellipsizeMode="tail">
              {req.address}
            </Text>
          </View>
        )}

        {/* Applications Status - Compact */}
        <View style={styles.compactStatusBar}>
          <View style={styles.compactStatusStats}>
            {selectedCount > 0 && (
              <View style={styles.compactStatItem}>
                <View style={[styles.compactStatDot, { backgroundColor: StatusColors.success }]} />
                <Text style={styles.compactStatText}>{selectedCount}</Text>
              </View>
            )}
            {pendingCount > 0 && (
              <View style={styles.compactStatItem}>
                <View style={[styles.compactStatDot, { backgroundColor: StatusColors.warning }]} />
                <Text style={styles.compactStatText}>{pendingCount}</Text>
              </View>
            )}
            {totalApplications > 0 && (
              <View style={styles.compactApplicants}>
                <View style={styles.compactAvatarsContainer}>
                  {applications.slice(0, 3).map((application: any, index: number) => {
                    const doctor = application.doctor;
                    const profilePhoto = doctor?.profile_photo_url || doctor?.profile_photo;
                    return profilePhoto ? (
                      <Avatar.Image
                        key={`avatar-${application.id}-${index}`}
                        size={24}
                        source={{ uri: getFullImageUrl(profilePhoto) }}
                        style={[styles.compactAvatar, { marginLeft: index > 0 ? -4 : 0 }]}
                      />
                    ) : (
                      <Avatar.Text
                        key={`avatar-text-${application.id}-${index}`}
                        size={24}
                        label={doctor?.name?.charAt(0)?.toUpperCase() || '?'}
                        style={[styles.compactAvatar, { marginLeft: index > 0 ? -4 : 0 }]}
                      />
                    );
                  })}
                  {totalApplications > 3 && (
                    <View style={[styles.compactMoreAvatar, { marginLeft: -4 }]}>
                      <Text style={styles.compactMoreAvatarText}>+{totalApplications - 3}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.compactApplicantsText}>{totalApplications} {totalApplications === 1 ? 'applicant' : 'applicants'}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}, (prev, next) => {
    // Custom comparison to prevent re-renders
    return (
        prev.req.id === next.req.id &&
        prev.req.updated_at === next.req.updated_at &&
        prev.req.applications?.length === next.req.applications?.length &&
        prev.req.status === next.req.status &&
        prev.req.is_expired === next.req.is_expired
    );
});

const SessionItem = React.memo(({ session }: { session: any }) => {
    // Animation for press effect
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Determine status
    const getSessionStatus = () => {
        if (session.status === 'completed' && session.hospital_confirmed) {
            return { text: 'Approved', color: StatusColors.success, icon: CheckCircle2 };
        } else if (session.status === 'completed') {
            return { text: 'Review Needed', color: StatusColors.warning, icon: Clock };
        } else if (session.status === 'in_progress') {
            return { text: 'In Progress', color: PrimaryColors.main, icon: Clock };
        }
        return { text: 'Scheduled', color: NeutralColors.textTertiary, icon: Calendar };
    };

    const status = getSessionStatus();
    const StatusIcon = status.icon;
    const doctor = session.doctor;
    const requirement = session.job_requirement;

    const formatTime = (time: string) => {
        if (!time) return '';
        try {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        } catch {
            return time;
        }
    };

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 1.02,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();
    };

    const handlePress = () => {
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1.02,
                useNativeDriver: true,
                tension: 300,
                friction: 10,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 300,
                friction: 10,
            }),
        ]).start(() => {
            if (session.status === 'completed' && !session.hospital_confirmed) {
                router.push(`/hospital/review-session/${session.id}` as any);
            } else {
                router.push(`/hospital/job-session/${session.id}` as any);
            }
        });
    };

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
        >
            <Animated.View
                style={[
                    styles.requirementCard,
                    session.status === 'completed' && session.hospital_confirmed ? styles.sessionCardGreen :
                    session.status === 'completed' && !session.hospital_confirmed ? styles.sessionCardOrange :
                    session.status === 'in_progress' ? styles.sessionCardBlue :
                    styles.sessionCardPurple,
                    {
                        transform: [{ scale: scaleAnim }]
                    }
                ]}
            >
                {/* Header Section */}
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.deptBadge, 
                              session.status === 'completed' && session.hospital_confirmed ? { backgroundColor: 'rgba(255, 255, 255, 0.25)' } :
                              session.status === 'completed' && !session.hospital_confirmed ? { backgroundColor: 'rgba(255, 255, 255, 0.25)' } :
                              session.status === 'in_progress' ? { backgroundColor: 'rgba(255, 255, 255, 0.25)' } :
                              session.status === 'scheduled' ? { backgroundColor: 'rgba(255, 255, 255, 0.25)' } : {}]}>
                            <Building2 size={14} color={session.status === 'completed' && session.hospital_confirmed ? '#FFFFFF' : 
                                  session.status === 'completed' && !session.hospital_confirmed ? '#FFFFFF' :
                                  session.status === 'in_progress' ? '#FFFFFF' :
                                  session.status === 'scheduled' ? '#FFFFFF' : PrimaryColors.main} />
                            <Text style={[styles.deptText,
                                  session.status === 'completed' && session.hospital_confirmed ? { color: '#FFFFFF' } :
                                  session.status === 'completed' && !session.hospital_confirmed ? { color: '#FFFFFF' } :
                                  session.status === 'in_progress' ? { color: '#FFFFFF' } :
                                  session.status === 'scheduled' ? { color: '#FFFFFF' } : {}]}>
                                {requirement?.department || 'Department'}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, 
                              session.status === 'completed' && session.hospital_confirmed ? { backgroundColor: 'rgba(255, 255, 255, 0.25)', borderColor: '#FFFFFF' } :
                              session.status === 'completed' && !session.hospital_confirmed ? { backgroundColor: 'rgba(255, 255, 255, 0.25)', borderColor: '#FFFFFF' } :
                              session.status === 'in_progress' ? { backgroundColor: 'rgba(255, 255, 255, 0.25)', borderColor: '#FFFFFF' } :
                              session.status === 'scheduled' ? { backgroundColor: 'rgba(255, 255, 255, 0.25)', borderColor: '#FFFFFF' } :
                              { backgroundColor: `${status.color}15`, borderColor: status.color }]}>
                            <StatusIcon size={12} color={session.status === 'completed' && session.hospital_confirmed ? '#FFFFFF' : 
                                  session.status === 'completed' && !session.hospital_confirmed ? '#FFFFFF' :
                                  session.status === 'in_progress' ? '#FFFFFF' :
                                  session.status === 'scheduled' ? '#FFFFFF' : status.color} />
                            <Text style={[styles.statusText, { color: session.status === 'completed' && session.hospital_confirmed ? '#FFFFFF' : 
                                  session.status === 'completed' && !session.hospital_confirmed ? '#FFFFFF' :
                                  session.status === 'in_progress' ? '#FFFFFF' :
                                  session.status === 'scheduled' ? '#FFFFFF' : status.color }]}>
                                {status.text}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Compact Info Row */}
                <View style={styles.compactInfoRow}>
                    <View style={styles.compactInfoItem}>
                        <User size={14} color={session.status === 'completed' && session.hospital_confirmed ? 'rgba(255, 255, 255, 0.9)' : 
                              session.status === 'completed' && !session.hospital_confirmed ? 'rgba(255, 255, 255, 0.9)' :
                              session.status === 'in_progress' ? 'rgba(255, 255, 255, 0.9)' :
                              session.status === 'scheduled' ? 'rgba(255, 255, 255, 0.9)' : NeutralColors.textSecondary} />
                        <Text style={[styles.compactInfoText, 
                              session.status === 'completed' && session.hospital_confirmed ? { color: 'rgba(255, 255, 255, 0.9)' } :
                              session.status === 'completed' && !session.hospital_confirmed ? { color: 'rgba(255, 255, 255, 0.9)' } :
                              session.status === 'in_progress' ? { color: 'rgba(255, 255, 255, 0.9)' } :
                              session.status === 'scheduled' ? { color: 'rgba(255, 255, 255, 0.9)' } : {}]}>
                            Dr. {doctor?.name || 'Doctor'}
                        </Text>
                    </View>
                    {session.check_in_time && (
                        <View style={styles.compactInfoItem}>
                            <Clock size={14} color={session.status === 'completed' && session.hospital_confirmed ? 'rgba(255, 255, 255, 0.9)' : 
                                  session.status === 'completed' && !session.hospital_confirmed ? 'rgba(255, 255, 255, 0.9)' :
                                  session.status === 'in_progress' ? 'rgba(255, 255, 255, 0.9)' :
                                  session.status === 'scheduled' ? 'rgba(255, 255, 255, 0.9)' : NeutralColors.textSecondary} />
                            <Text style={[styles.compactInfoText,
                                  session.status === 'completed' && session.hospital_confirmed ? { color: 'rgba(255, 255, 255, 0.9)' } :
                                  session.status === 'completed' && !session.hospital_confirmed ? { color: 'rgba(255, 255, 255, 0.9)' } :
                                  session.status === 'in_progress' ? { color: 'rgba(255, 255, 255, 0.9)' } :
                                  session.status === 'scheduled' ? { color: 'rgba(255, 255, 255, 0.9)' } : {}]}>
                                Check-in: {formatTime(session.check_in_time)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Date - Inline */}
                <View style={styles.compactDateRow}>
                    <Calendar size={13} color={session.status === 'completed' && session.hospital_confirmed ? 'rgba(255, 255, 255, 0.85)' : 
                          session.status === 'completed' && !session.hospital_confirmed ? 'rgba(255, 255, 255, 0.85)' :
                          session.status === 'in_progress' ? 'rgba(255, 255, 255, 0.85)' :
                          session.status === 'scheduled' ? 'rgba(255, 255, 255, 0.85)' : NeutralColors.textSecondary} />
                    <Text style={[styles.compactDateText,
                          session.status === 'completed' && session.hospital_confirmed ? { color: 'rgba(255, 255, 255, 0.85)' } :
                          session.status === 'completed' && !session.hospital_confirmed ? { color: 'rgba(255, 255, 255, 0.85)' } :
                          session.status === 'in_progress' ? { color: 'rgba(255, 255, 255, 0.85)' } :
                          session.status === 'scheduled' ? { color: 'rgba(255, 255, 255, 0.85)' } : {}]}>
                        {formatISTDateOnly(session.session_date)}
                        {session.start_time && ` • ${formatTime(session.start_time)}`}
                        {session.end_time && ` - ${formatTime(session.end_time)}`}
                    </Text>
                </View>

                {/* Payment - Inline */}
                {session.payment_amount && (
                    <View style={styles.compactLocationRow}>
                        <DollarSign size={13} color={session.status === 'completed' && session.hospital_confirmed ? 'rgba(255, 255, 255, 0.9)' : 
                              session.status === 'completed' && !session.hospital_confirmed ? 'rgba(255, 255, 255, 0.9)' :
                              session.status === 'in_progress' ? 'rgba(255, 255, 255, 0.9)' :
                              session.status === 'scheduled' ? 'rgba(255, 255, 255, 0.9)' : NeutralColors.textSecondary} />
                        <Text style={[styles.compactLocationText,
                              session.status === 'completed' && session.hospital_confirmed ? { color: 'rgba(255, 255, 255, 0.9)' } :
                              session.status === 'completed' && !session.hospital_confirmed ? { color: 'rgba(255, 255, 255, 0.9)' } :
                              session.status === 'in_progress' ? { color: 'rgba(255, 255, 255, 0.9)' } :
                              session.status === 'scheduled' ? { color: 'rgba(255, 255, 255, 0.9)' } : {}]}>
                            ₹{parseFloat(session.payment_amount || 0).toFixed(2)}
                        </Text>
                    </View>
                )}

                {/* Session Status - Compact */}
                <View style={[styles.compactStatusBar,
                      session.status === 'completed' && session.hospital_confirmed ? { borderTopColor: 'rgba(255, 255, 255, 0.3)' } :
                      session.status === 'completed' && !session.hospital_confirmed ? { borderTopColor: 'rgba(255, 255, 255, 0.3)' } :
                      session.status === 'in_progress' ? { borderTopColor: 'rgba(255, 255, 255, 0.3)' } :
                      session.status === 'scheduled' ? { borderTopColor: 'rgba(255, 255, 255, 0.3)' } : {}]}>
                    <View style={styles.compactStatusStats}>
                        {session.status === 'completed' && !session.hospital_confirmed && (
                            <View style={styles.compactStatItem}>
                                <View style={[styles.compactStatDot, { backgroundColor: '#FFFFFF' }]} />
                                <Text style={[styles.compactStatText, { color: '#FFFFFF' }]}>Review</Text>
                            </View>
                        )}
                        {session.status === 'completed' && session.hospital_confirmed && (
                            <View style={styles.compactStatItem}>
                                <View style={[styles.compactStatDot, { backgroundColor: '#FFFFFF' }]} />
                                <Text style={[styles.compactStatText, { color: '#FFFFFF' }]}>Approved</Text>
                            </View>
                        )}
                        {session.status === 'in_progress' && (
                            <View style={styles.compactStatItem}>
                                <View style={[styles.compactStatDot, { backgroundColor: '#FFFFFF' }]} />
                                <Text style={[styles.compactStatText, { color: '#FFFFFF' }]}>In Progress</Text>
                            </View>
                        )}
                        {session.status === 'scheduled' && (
                            <View style={styles.compactStatItem}>
                                <View style={[styles.compactStatDot, { backgroundColor: '#FFFFFF' }]} />
                                <Text style={[styles.compactStatText, { color: '#FFFFFF' }]}>Scheduled</Text>
                            </View>
                        )}
                        {session.payment_amount && (
                            <View style={[styles.compactPaymentBadge, 
                                  session.status === 'completed' && session.hospital_confirmed ? { backgroundColor: 'rgba(255, 255, 255, 0.25)' } :
                                  session.status === 'completed' && !session.hospital_confirmed ? { backgroundColor: 'rgba(255, 255, 255, 0.25)' } :
                                  session.status === 'in_progress' ? { backgroundColor: 'rgba(255, 255, 255, 0.25)' } :
                                  session.status === 'scheduled' ? { backgroundColor: 'rgba(255, 255, 255, 0.25)' } : {}]}>
                                <DollarSign size={12} color={session.status === 'completed' && session.hospital_confirmed ? '#FFFFFF' : 
                                      session.status === 'completed' && !session.hospital_confirmed ? '#FFFFFF' :
                                      session.status === 'in_progress' ? '#FFFFFF' :
                                      session.status === 'scheduled' ? '#FFFFFF' : PrimaryColors.accent} />
                                <Text style={[styles.compactPaymentBadgeText,
                                      session.status === 'completed' && session.hospital_confirmed ? { color: '#FFFFFF' } :
                                      session.status === 'completed' && !session.hospital_confirmed ? { color: '#FFFFFF' } :
                                      session.status === 'in_progress' ? { color: '#FFFFFF' } :
                                      session.status === 'scheduled' ? { color: '#FFFFFF' } : {}]}>
                                    ₹{parseFloat(session.payment_amount || 0).toFixed(0)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}, (prev, next) => {
    return (
        prev.session.id === next.session.id &&
        prev.session.status === next.session.status &&
        prev.session.updated_at === next.session.updated_at &&
        prev.session.hospital_confirmed === next.session.hospital_confirmed
    );
});

const HOSPITAL_TOKEN_KEY = 'hospitalToken';
const HOSPITAL_INFO_KEY = 'hospitalInfo';

export default function HospitalDashboard() {
  const theme = useTheme();
  const safeBottomPadding = useSafeBottomPadding();
  // Use refs to track if data has been loaded at least once to avoid spinner flicker on focus
  const hasLoadedSessions = React.useRef(false);

  const [hospital, setHospital] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const loadSessions = async (silent = false) => {
      try {
          if (!silent && !hasLoadedSessions.current && sessions.length === 0) {
             setLoadingSessions(true);
          }
          
          const response = await API.get('/hospital/sessions');
          const allSessions = response.data.sessions || [];
          const sorted = allSessions.sort((a: any, b: any) => {
              const scoreA = (a.status === 'completed' && !a.hospital_confirmed) ? 3 : (a.status === 'in_progress' ? 2 : 1);
              const scoreB = (b.status === 'completed' && !b.hospital_confirmed) ? 3 : (b.status === 'in_progress' ? 2 : 1);
              
              if (scoreA !== scoreB) return scoreB - scoreA;
              if (a.updated_at !== b.updated_at) {
                  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
              }
              return b.id - a.id;
          });
          
          // STRICT ANTI-FLICKER: Only update if meaningfully different
          setSessions(prev => {
             if (prev.length !== sorted.length) return sorted;
             
             const isDifferent = sorted.some((item: any, index: number) => {
                 const prevItem = prev[index];
                 if (item.id !== prevItem.id) return true;
                 if (item.status !== prevItem.status) return true;
                 if (item.hospital_confirmed !== prevItem.hospital_confirmed) return true;
                 if (item.payment_status !== prevItem.payment_status) return true;
                 return false;
             });
             
             return isDifferent ? sorted : prev;
          });
          
          hasLoadedSessions.current = true;
      } catch (error: any) {
          if (error.response?.status === 401) {
            router.replace('/hospital/login');
          }
      } finally {
          // Only turn off loading if we turned it on
          if (!silent && loadingSessions) setLoadingSessions(false);
          // Force false if we are done with initial load
          if (!hasLoadedSessions.current) setLoadingSessions(false); 
      }
  };

  const [requirements, setRequirements] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [formData, setFormData] = useState({
    department: '',
    department_id: null as number | null,
    work_type: 'full-time',
    required_sessions: '1',
    work_required_date: '',
    start_time: '',
    end_time: '',
    duration_hours: '1',
    description: '',
    location_name: '',
    address: '',
    payment_amount: '',
  });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isCustomLocation, setIsCustomLocation] = useState(false);

  // Auto-calculate duration when start/end time changes
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const [startHour, startMin] = formData.start_time.split(':').map(Number);
      const [endHour, endMin] = formData.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes > startMinutes) {
        const durationMinutes = endMinutes - startMinutes;
        const durationHours = (durationMinutes / 60).toFixed(1);
        setFormData(prev => ({ ...prev, duration_hours: durationHours }));
      }
    }
  }, [formData.start_time, formData.end_time]);

  // Ensure status bar stays blue always
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#2563EB', true);
      StatusBar.setTranslucent(false);
      StatusBar.setBarStyle('light-content', true);
    }
  }, []);

  // Ensure status bar stays blue when form is shown/hidden
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#2563EB', true);
      StatusBar.setBarStyle('light-content', true);
    }
  }, [showForm]);

  // Reset status bar to blue when screen comes into focus (important!)
  useFocusEffect(
    useCallback(() => {
      // Set status bar to blue immediately when screen is focused
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#2563EB', true);
        StatusBar.setTranslucent(false);
        StatusBar.setBarStyle('light-content', true);
      }
      
      // Also set for iOS
      StatusBar.setBarStyle('light-content', true);
      
      return () => {
        // Optional: cleanup if needed
      };
    }, [])
  );

  useEffect(() => {
    // Check authentication first
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem(HOSPITAL_TOKEN_KEY);
        if (!token) {
          // console.log('⚠️ Hospital not authenticated, redirecting to login...');
          router.replace('/hospital/login');
          return;
        }
        // If authenticated, load data
        loadHospital();
        loadSessions(); // Load sessions initially
        loadRequirements();
        // loadNotifications(); // Temporarily disabled to prevent crash
      } catch (error) {
        console.error('Error checking auth:', error);
        router.replace('/hospital/login');
      }
    };
    
    checkAuth();
  }, []);

  // Listen for hospital data updates (logo, verification status, etc.)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('hospitalDataUpdated', async () => {
      // Reload hospital data when updated from profile edit or admin verification
      await loadHospital(true); // Silent reload
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Poll for verification status changes more frequently (every 5 seconds)
  useEffect(() => {
    if (!hospital) return;

    const checkVerificationStatus = async () => {
      try {
        const response = await API.get('/hospital/profile');
        if (response.data?.hospital) {
          const newVerificationStatus = response.data.hospital.verification_status;
          const currentVerificationStatus = hospital?.verification_status;
          
          // If verification status changed, update hospital data
          if (newVerificationStatus !== currentVerificationStatus) {
            const hospitalData = response.data.hospital;
            await AsyncStorage.setItem(HOSPITAL_INFO_KEY, JSON.stringify(hospitalData));
            setHospital({
              ...hospitalData,
              _lastUpdated: Date.now(),
            });
          }
        }
      } catch (error) {
        // Silently fail - don't spam errors
      }
    };

    const intervalId = setInterval(checkVerificationStatus, 5000); // Check every 5 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [hospital?.verification_status]);

  // Poll for updates when screen is focused
  useFocusEffect(
    useCallback(() => {
        let isActive = true;

        const pollData = async () => {
            if (!isActive) return;
            // Silent refresh to avoid flickering
            await Promise.all([
                isActive && loadHospital(),
                isActive && loadSessions(true),
                isActive && loadRequirements(true),
                // isActive && loadNotifications(true) // Temporarily disabled
            ]);
        };

        // Poll every 15 seconds
        const intervalId = setInterval(pollData, 15000);
        
        // Initial load on focus (silent)
        pollData();

        return () => {
            isActive = false;
            clearInterval(intervalId);
        };
    }, [])
  );



  const hasLoadedRequirements = React.useRef(false);

  const loadRequirements = async (silent = false) => {
    try {
      const response = await API.get('/hospital/my-requirements');
      const rawData = response.data.requirements || [];
      // Ensure deterministic order (newest first primarily by ID)
      const newData = rawData.sort((a: any, b: any) => b.id - a.id);
      
      setRequirements(prev => {
        if (prev.length !== newData.length) return newData;
        
        // Optimized comparison for requirements
        const isDifferent = newData.some((item: any, index: number) => {
             const prevItem = prev[index];
             // Compare essential fields
             if (item.id !== prevItem.id) return true;
             if (item.updated_at !== prevItem.updated_at) return true;
             if (item.status !== prevItem.status) return true; 
             if ((item.applications?.length || 0) !== (prevItem.applications?.length || 0)) return true;
             return false;
        });
        
        return isDifferent ? newData : prev;
      });
      hasLoadedRequirements.current = true;
    } catch (error: any) {
      console.error('Error loading requirements:', error);
      if (error.response?.status === 401) {
        router.replace('/hospital/login');
      }
    }
  };

  const [isShowingNotification, setIsShowingNotification] = useState(false);
  const notificationCountRef = React.useRef(0); // Use ref for stable comparison in callbacks

  const loadNotifications = async (silent = false) => {
    try {
      // 1. Get Unread Count first (lightweight)
      const countResponse = await API.get('/hospital/notifications/unread-count');
      const newCount = countResponse.data.unread_count || 0;
      
      // Only update state if changed
      if (newCount !== notificationCount) {
         setNotificationCount(newCount);
      }

      // 2. Handling Local Notifications
      const previousCount = notificationCountRef.current;
      
      if (newCount > previousCount && !isShowingNotification) {
          setIsShowingNotification(true);
          // ... fetch latest notification logic ...
           try {
             // Get latest notification
             const notificationsResponse = await API.get('/hospital/notifications?page=1&per_page=1');
             const latestNotification = notificationsResponse.data.notifications?.[0];

             if (latestNotification && !latestNotification.is_read) {
                 if (Platform.OS !== 'web') {
                    try {
                        const { scheduleLocalNotification } = require('@/utils/notifications');
                        await scheduleLocalNotification(
                            latestNotification.title,
                            latestNotification.message,
                            {
                                type: latestNotification.type,
                                user_type: latestNotification.user_type || 'hospital',
                                notification_id: latestNotification.id,
                                ...(latestNotification.data || {}),
                            },
                            latestNotification.id 
                        );
                    } catch (e) { console.warn('Local notif error', e); }
                 }
             }
          } catch (e) { console.warn('Fetch latest notif error', e); }
          finally {
              setTimeout(() => setIsShowingNotification(false), 2000);
          }
      }
      
      notificationCountRef.current = newCount;

    } catch (error: any) {
      console.error('Error loading notifications:', error);
    }
  };
  
  const loadHospital = async (silent = false) => {
    try {
      // Try to load fresh data from API first
      try {
        const response = await API.get('/hospital/profile');
        if (response.data?.hospital) {
          const hospitalData = response.data.hospital;
          // Save to AsyncStorage for offline access
          await AsyncStorage.setItem(HOSPITAL_INFO_KEY, JSON.stringify(hospitalData));
          
          // Update hospital state - this will trigger re-render with new logo/verification status
          setHospital(prev => {
            // Force update by adding timestamp to trigger image refresh
            return {
              ...hospitalData,
              _lastUpdated: Date.now(), // Cache buster for images
            };
          });
          
          // Use hospital location as default if available
          if (hospitalData.latitude && hospitalData.longitude) {
             setLocation({
               latitude: parseFloat(hospitalData.latitude),
               longitude: parseFloat(hospitalData.longitude)
             });
          }
          return;
        }
      } catch (apiError: any) {
        if (!silent) {
          console.log('⚠️ API fetch failed, using cached data:', apiError);
        }
      }

      // Fallback to cached data from AsyncStorage
      const info = await AsyncStorage.getItem(HOSPITAL_INFO_KEY);
      if (info) {
        const hospitalData = JSON.parse(info);
        setHospital(prev => ({
          ...hospitalData,
          _lastUpdated: Date.now(), // Cache buster
        }));
        
        // Use hospital location as default if available
        if (hospitalData.latitude && hospitalData.longitude) {
           setLocation({
             latitude: parseFloat(hospitalData.latitude),
             longitude: parseFloat(hospitalData.longitude)
           });
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('Error loading hospital:', error);
      }
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      // Use OpenStreetMap Nominatim API (No Key Required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AlverConnect/1.0', // Required by Nominatim
          },
        }
      );
      
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        const addressParts = [
          addr.road || addr.pedestrian || addr.street,
          addr.suburb || addr.neighborhood || addr.district,
          addr.city || addr.town || addr.village,
          addr.state || addr.province,
          addr.postcode
        ].filter(part => part && part !== null);
        
        const formattedAddress = [...new Set(addressParts)].join(', ');
        
        // Construct a location name (e.g., "City, Suburb")
        const locName = [
            addr.city || addr.town || addr.village,
            addr.suburb || addr.neighborhood,
            addr.state
        ].filter(Boolean).join(', ');

        setFormData(prev => ({
          ...prev,
          address: formattedAddress || data.display_name, // Fallback to full display name
          location_name: locName || ''
        }));
      }
    } catch (error) {
      // console.log('Reverse geocoding failed:', error);
      // Fallback: If network fails, at least keep coordinates
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      
      setLocation(newLocation);
      await reverseGeocode(newLocation.latitude, newLocation.longitude);
      
      Alert.alert('Success', 'Location captured!');
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const handleSubmit = async () => {
    // Frontend validation
    if (!formData.department_id) {
      Alert.alert('Error', 'Please select a department');
      return;
    }

    if (!formData.work_type || !formData.required_sessions || !formData.work_required_date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (!formData.start_time || !formData.end_time) {
      Alert.alert('Error', 'Please select both start time and end time');
      return;
    }
    
    if (!location) {
      Alert.alert('Error', 'Please select a location on the map');
      Alert.alert('Error', 'Please select start and end time');
      return;
    }

    // Validate date is today or later
    const selectedDate = new Date(formData.work_required_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      Alert.alert('Error', 'Work required date must be today or later');
      return;
    }

    // Check if hospital is verified before submitting
    if (hospital?.verification_status !== 'approved') {
      Alert.alert(
        'Verification Required',
        'Your hospital account needs to be verified before you can post job requirements. Please wait for admin approval.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const safeParseFloat = (val: string) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      const safeParseInt = (val: string) => {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 1 : parsed;
      };

      const data: any = {
        department_id: formData.department_id,
        work_type: formData.work_type,
        required_sessions: safeParseInt(formData.required_sessions),
        work_required_date: formData.work_required_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration_hours: safeParseFloat(formData.duration_hours) > 0 ? safeParseFloat(formData.duration_hours) : 1,
        description: formData.description?.trim() || null,
        location_name: formData.location_name?.trim() || null,
        address: formData.address?.trim() || null,
      };

      if (location) {
        data.latitude = location.latitude;
        data.longitude = location.longitude;
      }


      if (formData.payment_amount && formData.payment_amount.trim()) {
        const paymentAmount = safeParseFloat(formData.payment_amount);
        if (paymentAmount >= 0) {
          data.payment_amount = paymentAmount;
        }
      }


      // Post job directly without payment
      await API.post('/hospital/requirements', data);
      
      Alert.alert('Success', 'Job requirement posted successfully!');
      
      // Reset form
      setShowForm(false);
      setFormData({
        department: '',
        department_id: null,
        work_type: 'full-time',
        required_sessions: '1',
        work_required_date: '',
        start_time: '',
        end_time: '',
        duration_hours: '1',
        description: '',
        location_name: '',
        address: '',
        payment_amount: '',
      });
      
      // Reset to hospital location if available
      if (hospital?.latitude && hospital?.longitude) {
        setLocation({
          latitude: parseFloat(hospital.latitude),
          longitude: parseFloat(hospital.longitude)
        });
      } else {
        setLocation(null);
      }
      setIsCustomLocation(false);
      
      // Reload requirements
      loadRequirements();
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to post job requirement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => { // Actually hides the job post
    Alert.alert('Hide Job Post', 'This will hide the job post from view. The data will be preserved for payment and session records.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hide',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.delete(`/hospital/requirements/${id}`);
            loadRequirements();
          } catch (error: any) {
            console.error('Error hiding requirement:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to hide requirement');
          }
        },
      },
    ]);
  };

  const performHospitalLogout = async () => {
    // console.log('✅ Hospital logout confirmed, starting process...');
    try {
      // Try to call backend logout API
      // console.log('📞 Calling backend logout API...');
      const response = await API.post('/hospital/logout');
      // console.log('✅ Backend logout successful');
      // console.log('📊 Backend response:', response.data);
      if (response.data?.tokens_deleted) {
        // console.log(`🗑️ Deleted ${response.data.tokens_deleted} token(s) from backend`);
      }
    } catch (error: any) {
      // Continue with logout even if backend call fails
      console.warn('⚠️ Backend logout failed, continuing with local logout');
      console.warn('⚠️ Error details:', error?.response?.data || error?.message || error);
      // Don't throw - continue with local logout
    }
    
    // Clear all hospital auth data
    try {
      // console.log('🧹 Clearing hospital auth data...');
      await AsyncStorage.multiRemove([HOSPITAL_TOKEN_KEY, HOSPITAL_INFO_KEY]);
      // Also try individual removal to ensure it's cleared
      await AsyncStorage.removeItem(HOSPITAL_TOKEN_KEY);
      await AsyncStorage.removeItem(HOSPITAL_INFO_KEY);
      await AsyncStorage.removeItem('hospitalToken');
      await AsyncStorage.removeItem('hospitalInfo');
      
      // Verify it's cleared
      const remainingToken = await AsyncStorage.getItem(HOSPITAL_TOKEN_KEY);
      const remainingInfo = await AsyncStorage.getItem(HOSPITAL_INFO_KEY);
      if (remainingToken || remainingInfo) {
        console.warn('⚠️ Hospital auth data still exists after cleanup');
      } else {
        // console.log('✅ Hospital auth data cleared successfully');
      }
    } catch (clearError) {
      console.error('❌ Error clearing hospital auth:', clearError);
      console.error('❌ Clear error details:', JSON.stringify(clearError, null, 2));
    }
    
    // Navigate directly to login page
    // console.log('🔄 Navigating to login page...');
    try {
      router.replace('/hospital/login');
      // console.log('✅ Hospital logout navigation completed');
    } catch (navError) {
      console.error('❌ Hospital logout navigation error:', navError);
      // Try alternative
      try {
        router.push('/hospital/login');
      } catch (altError) {
        console.error('❌ Alternative navigation also failed:', altError);
      }
    }
  };

  const handleLogout = () => {
    // console.log('🔘 Hospital logout button pressed');
    Keyboard.dismiss();
    // Show custom modal instead of Alert
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    // console.log('✅ User confirmed hospital logout - starting logout process');
    setShowLogoutModal(false);
    performHospitalLogout().catch((error) => {
      console.error('❌ Error in performHospitalLogout:', error);
    });
  };

  const cancelLogout = () => {
    // console.log('❌ Hospital logout cancelled by user');
    setShowLogoutModal(false);
  };

  return (
    <ScreenSafeArea backgroundColor="#2563EB" statusBarStyle="light-content" edges={['top', 'left', 'right']}>
      {/* Status bar - always blue with light content */}
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#2563EB" 
        translucent={false}
      />
      {/* Status bar handler */}
      <StatusBarHandler 
        backgroundColor="#2563EB" 
        barStyle="light-content"
      />
      {/* Custom Logout Confirmation Modal - appears on top of everything */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out? All your login details will be removed.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.content, { paddingBottom: 120 + safeBottomPadding + 20 }]}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={true}
          overScrollMode="never"
        >
        {/* Enhanced Header with Gradient */}
        <LinearGradient
          colors={['#2563EB', '#1D4ED8', '#1E40AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.push('/hospital/profile')} style={styles.profileButton}>
               {(() => {
                 const rawSrc = hospital?.profile_photo || hospital?.logo_path || hospital?.logo || hospital?.logo_url;
                 const fullUrl = rawSrc ? getFullImageUrl(rawSrc) : null;
                 // Add cache buster to force image refresh when hospital data updates
                 const cacheBuster = hospital?._lastUpdated || Date.now();
                 const imageUrl = fullUrl ? `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}t=${cacheBuster}` : null;
                 
                 if (imageUrl) {
                   return (
                     <Avatar.Image 
                       key={`hospital-${hospital?.id || 'no-id'}-${hospital?._lastUpdated || Date.now()}`}
                       size={56} 
                       source={{ uri: imageUrl }}
                       onError={(e) => console.log('[Dashboard Header] Image Error:', e.nativeEvent.error)}
                       style={{ backgroundColor: '#fff', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }} 
                     />
                   );
                 } else {
                   return (
                     <Avatar.Text 
                       size={56} 
                       label={hospital?.name?.charAt(0)?.toUpperCase() || 'H'} 
                       style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }}
                       labelStyle={{ color: '#fff', fontWeight: '700', fontSize: 24 }}
                     />
                   );
                 }
               })()}
            </TouchableOpacity>
            
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.hospitalName} numberOfLines={2}>
                {hospital?.name || 'Hospital Name'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={() => router.push('/hospital/notifications')}
                style={styles.iconButton}
              >
                <View style={styles.iconButtonInner}>
                  <Bell size={22} color="#fff" />
                  {notificationCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleLogout}
                style={styles.iconButton}
              >
                <View style={styles.iconButtonInner}>
                  <LogOut size={22} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Statistics Cards - Compact Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={[styles.statCard, styles.statCard1]} 
            activeOpacity={0.7}
          >
            <View style={[styles.statIcon, styles.statIcon1]}>
              <Building2 size={20} color="#2563EB" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue} numberOfLines={1}>
                {sessions.filter((s: any) => s.status === 'in_progress').length}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Active Jobs</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, styles.statCard2]} 
            activeOpacity={0.7}
          >
            <View style={[styles.statIcon, styles.statIcon2]}>
              <CheckCircle2 size={18} color="#10B981" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue} numberOfLines={1}>
                {sessions.filter((s: any) => s.status === 'completed' && s.hospital_confirmed).length}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Completed</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, styles.statCard4]} 
            activeOpacity={0.7}
          >
            <View style={[styles.statIcon, styles.statIcon4]}>
              <Clock size={20} color="#F59E0B" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue} numberOfLines={1}>
                {sessions.filter((s: any) => s.status === 'completed' && !s.hospital_confirmed).length}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Review</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, styles.statCard3]} 
            activeOpacity={0.7}
          >
            <View style={[styles.statIcon, styles.statIcon3]}>
              <FileText size={18} color="#8B5CF6" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue} numberOfLines={1}>
                {requirements.length}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Posted Jobs</Text>
            </View>
          </TouchableOpacity>
        </View>

        {!showForm ? (
          <>
            {/* Quick Actions - Card Design */}
            <View style={styles.actionsSection}>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (hospital?.verification_status !== 'approved') {
                      Alert.alert(
                        'Verification Required',
                        'Your hospital account needs to be verified before you can post job requirements. Please wait for admin approval.',
                        [{ text: 'OK' }]
                      );
                    } else {
                      setShowForm(true);
                    }
                  }}
                >
                  <View style={[styles.actionCardContent, styles.actionCardBlue]}>
                    {/* Header Section */}
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={[styles.deptBadge, styles.deptBadgeLight]}>
                          <Plus size={14} color="#FFFFFF" />
                          <Text style={[styles.deptText, { color: '#FFFFFF' }]}>New Job</Text>
                        </View>
                      </View>
                    </View>

                    {/* Info Row */}
                    <View style={styles.compactInfoRow}>
                      <View style={styles.compactInfoItem}>
                        <FileText size={14} color="rgba(255, 255, 255, 0.9)" />
                        <Text style={[styles.compactInfoText, { color: 'rgba(255, 255, 255, 0.9)' }]}>Create Requirement</Text>
                      </View>
                    </View>

                    {/* Description */}
                    <View style={styles.compactDateRow}>
                      <Text style={[styles.actionCardDescription, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                        Post a new job requirement for doctors
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.7}
                  onPress={() => router.push('/hospital/live-tracking')}
                >
                  <View style={[styles.actionCardContent, styles.actionCardGreen]}>
                    {/* Header Section */}
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={[styles.deptBadge, styles.deptBadgeLight]}>
                          <Navigation size={14} color="#FFFFFF" />
                          <Text style={[styles.deptText, { color: '#FFFFFF' }]}>Live Tracking</Text>
                        </View>
                      </View>
                    </View>

                    {/* Info Row */}
                    <View style={styles.compactInfoRow}>
                      <View style={styles.compactInfoItem}>
                        <Clock size={14} color="rgba(255, 255, 255, 0.9)" />
                        <Text style={[styles.compactInfoText, { color: 'rgba(255, 255, 255, 0.9)' }]}>Real-time Location</Text>
                      </View>
                    </View>

                    {/* Description */}
                    <View style={styles.compactDateRow}>
                      <Text style={[styles.actionCardDescription, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                        Track doctors in real-time
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Job Sessions Section - Enhanced Design */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                 <View style={styles.sectionTitleContainer}>
                   <Building2 size={20} color={PrimaryColors.main} />
                   <Text style={styles.sectionTitle}>Job Sessions</Text>
                 </View>
                 <TouchableOpacity 
                   onPress={() => router.push('/hospital/sessions' as any)}
                   style={styles.viewAllButton}
                 >
                    <Text style={styles.viewAllText}>View All</Text>
                    <Navigation size={14} color={PrimaryColors.main} />
                 </TouchableOpacity>
              </View>
              
              {(!sessions || sessions.length === 0) ? (
                  <View style={styles.emptySessionsContainer}>
                    <View style={styles.emptySessionsCard}>
                      <View style={styles.emptyIconContainer}>
                        <Clock size={48} color={NeutralColors.textTertiary} />
                      </View>
                      <Text style={styles.emptySessionsTitle}>No Active Sessions</Text>
                      <Text style={styles.emptySessionsSubtitle}>Job sessions will appear here when doctors are assigned to your requirements</Text>
                    </View>
                  </View>
              ) : (
                  <View style={styles.sessionsContainer}>
                    {sessions.slice(0, 5).map((session: any) => (
                        <SessionItem key={session.id} session={session} />
                    ))}
                  </View>
              )}
            </View>

            {/* Requirements Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Posted Requirements</Text>
                <Chip style={styles.countChip} textStyle={styles.countChipText}>
                  {requirements.length}
                </Chip>
              </View>

              {requirements.length === 0 ? (
                <Card style={styles.emptyCard} mode="outlined">
                  <Card.Content style={styles.emptyContent}>
                    <Building2 size={40} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Requirements Yet</Text>
                    <Text style={styles.emptySubtitle}>Post your first job requirement to get started</Text>
                    <Button
                      mode="contained"
                      onPress={() => {
                        // Check if hospital is verified
                        if (hospital?.verification_status !== 'approved') {
                          // Show notification only if not verified
                          Alert.alert(
                            'Verification Required',
                            'Your hospital account needs to be verified before you can post job requirements. Please wait for admin approval.',
                            [{ text: 'OK' }]
                          );
                        } else {
                          // If verified, open form directly without notification
                          setShowForm(true);
                        }
                      }}
                      style={styles.emptyButton}
                      buttonColor="#2563EB"
                      textColor="#fff"
                      icon={() => <Plus size={16} color="#fff" />}
                    >
                      Post First Requirement
                    </Button>
                  </Card.Content>
                </Card>
              ) : (
                requirements.map((req) => (
                  <RequirementItem key={req.id} req={req} onDelete={handleDelete} />
                ))
              )}
            </View>



            {/* Requirements Section */}
          </>
        ) : (
          <Card style={styles.formCard} mode="outlined">
            <Card.Content>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Post Job Requirement</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department *</Text>
              <DepartmentPicker
                value={formData.department_id}
                onValueChange={(id) => setFormData({ ...formData, department_id: id })}
                placeholder="Select department"
                required
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Work Type *</Text>
              <View style={styles.workTypeRow}>
                {['full-time', 'part-time', 'locum', 'contract'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.workTypeButton,
                      formData.work_type === type && { backgroundColor: PrimaryColors.main },
                    ]}
                    onPress={() => setFormData({ ...formData, work_type: type })}
                  >
                    <Text
                      style={[
                        styles.workTypeText,
                        formData.work_type === type && { color: '#fff' },
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Required Sessions *</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of sessions"
                value={formData.required_sessions}
                onChangeText={(text) => setFormData({ ...formData, required_sessions: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Work Required Date *</Text>
              <DatePicker
                value={formData.work_required_date}
                onValueChange={(date) => setFormData({ ...formData, work_required_date: date })}
                placeholder="Select work required date"
                required
                minimumDate={new Date()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Time *</Text>
              <TimePicker
                value={formData.start_time}
                onValueChange={(time) => setFormData({ ...formData, start_time: time })}
                placeholder="Select start time"
                required
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Time *</Text>
              <TimePicker
                value={formData.end_time}
                onValueChange={(time) => setFormData({ ...formData, end_time: time })}
                placeholder="Select end time"
                required
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration (Hours) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: NeutralColors.cardBackground, opacity: 0.7 }]}
                placeholder="Auto-calculated"
                value={formData.duration_hours}
                onChangeText={(text) => setFormData({ ...formData, duration_hours: text })}
                keyboardType="numeric"
                editable={true}
              />
              <Text style={[styles.helpText, { color: NeutralColors.textSecondary }]}>
                Auto-calculated from start and end time (editable if needed)
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Job description and requirements"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Main Hospital, Branch Clinic"
                value={formData.location_name}
                onChangeText={(text) => setFormData({ ...formData, location_name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Full address"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location *</Text>
              
              {!isCustomLocation ? (
                <View style={styles.defaultLocationCard}>
                  <View style={styles.defaultLocationHeader}>
                    <View style={styles.iconContainer}>
                      <Building2 size={24} color={PrimaryColors.main} />
                    </View>
                    <View style={styles.defaultLocationText}>
                      <Text style={styles.defaultLocationTitle}>Using Hospital Location</Text>
                      <Text style={styles.defaultLocationAddress} numberOfLines={2}>
                        {hospital?.address || 'Your registered hospital address'}
                      </Text>
                      {hospital?.latitude && hospital?.longitude && (
                         <Text style={styles.coordinateText}>
                           {parseFloat(String(hospital.latitude)).toFixed(4)}, {parseFloat(String(hospital.longitude)).toFixed(4)}
                         </Text>
                      )}
                    </View>
                  </View>
                  <Button 
                    mode="outlined" 
                    onPress={() => setIsCustomLocation(true)}
                    style={styles.changeLocationButton}
                    textColor={PrimaryColors.main}
                  >
                    Change Location
                  </Button>
                </View>
              ) : (
                <View style={styles.customLocationContainer}>
                    <View style={styles.locationActionsRow}>
                      <Text style={styles.mapHint}>
                        Drag map to pin exact job location
                      </Text>
                      <TouchableOpacity onPress={() => {
                        setIsCustomLocation(false);
                        if (hospital?.latitude && hospital?.longitude) {
                          setLocation({
                            latitude: parseFloat(hospital.latitude),
                            longitude: parseFloat(hospital.longitude)
                          });
                        }
                      }}>
                        <Text style={styles.resetLocationText}>Reset to Default</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.useCurrentLocationBtn}
                      onPress={getCurrentLocation}
                    >
                      <Navigation size={16} color="#fff" fill="#fff" />
                      <Text style={styles.useCurrentLocationText}>Use Current Device Location</Text>
                    </TouchableOpacity>
                  
                  <LocationPickerMap
                    initialLatitude={location?.latitude}
                    initialLongitude={location?.longitude}
                    onLocationSelect={(lat, lng) => {
                      setLocation({ latitude: lat, longitude: lng });
                      reverseGeocode(lat, lng);
                    }}
                    height={280}
                  />
                  
                  {location && (
                    <View style={styles.locationDisplay}>
                      <MapPin size={16} color={StatusColors.success} />
                      <Text style={styles.locationDisplayText}>
                        Selected: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter payment amount"
                value={formData.payment_amount}
                onChangeText={(text) => setFormData({ ...formData, payment_amount: text })}
                keyboardType="numeric"
              />
              <Text style={[styles.helpText, { color: NeutralColors.textSecondary }]}>
                Amount to be paid to the doctor for this job
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              style={[styles.submitButton, { backgroundColor: '#2563EB' }]}
              buttonColor="#2563EB"
              textColor="#fff"
            >
              Post Requirement
            </Button>
            </Card.Content>
          </Card>
        )}

        {/* Promo Carousel - At the bottom */}
        <PromoCarousel 
          onPromoPress={(promo) => {
            router.push({
              pathname: '/blog-detail',
              params: { blogId: promo.id }
            });
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
    
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF6FF' },
  scrollView: { flex: 1 },
  content: { 
    paddingBottom: 24,
  },
  headerGradient: {
    backgroundColor: '#2563EB',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileButton: {
    marginRight: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  iconButtonInner: {
    position: 'relative',
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  menuIcon: {
    padding: 8,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
    marginBottom: 2,
  },
  hospitalName: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  bellIcon: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderWidth: 1,
    borderColor: NeutralColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  statIcon1: {
    backgroundColor: '#DBEAFE',
  },
  statIcon2: {
    backgroundColor: '#ECFDF5',
  },
  statIcon3: {
    backgroundColor: '#F3E8FF',
  },
  statIcon4: {
    backgroundColor: '#FEE2E2',
  },
  statIcon5: {
    backgroundColor: '#ECFDF5',
  },
  statIcon6: {
    backgroundColor: '#F3E8FF',
  },
  statCard1: {
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  statCard2: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  statCard3: {
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  statCard4: {
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  statCard5: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  statCard6: {
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  statTextContainer: {
    width: '100%',
    marginTop: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: NeutralColors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    color: NeutralColors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    minWidth: 0,
    maxWidth: '48%',
  },
  actionCardContent: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: NeutralColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 120,
    height: 120,
  },
  actionCardDescription: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    fontWeight: '400',
    lineHeight: 16,
  },
  actionCardBlue: {
    backgroundColor: '#2563EB',
    borderColor: '#1E40AF',
  },
  actionCardGreen: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  sessionCardBlue: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  sessionCardGreen: {
    backgroundColor: '#6366F1',
    borderColor: '#4F46E5',
  },
  sessionCardOrange: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  sessionCardPurple: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
  },
  requirementCardBlue: {
    backgroundColor: '#FFFFFF',
    borderColor: '#93C5FD',
    borderLeftWidth: 4,
  },
  requirementCardGreen: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10B981',
    borderLeftWidth: 4,
  },
  requirementCardYellow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F59E0B',
    borderLeftWidth: 4,
  },
  requirementCardRed: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EF4444',
    borderLeftWidth: 4,
  },
  deptBadgeLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${PrimaryColors.main}10`,
  },
  viewAllText: {
    color: PrimaryColors.main,
    fontWeight: '600',
    fontSize: 14,
  },
  sessionsContainer: {
    marginTop: 8,
    gap: 12,
  },
  emptySessionsContainer: {
    marginTop: 8,
  },
  emptySessionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NeutralColors.border,
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${NeutralColors.textTertiary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptySessionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 8,
  },
  emptySessionsSubtitle: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  countChip: {
    backgroundColor: '#EFF6FF',
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    lineHeight: 18,
  },
  emptyCard: {
    borderRadius: 12,
    marginTop: 8,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
    lineHeight: 20,
  },
  emptyButton: {
    borderRadius: 10,
  },
  requirementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: NeutralColors.border,
    minHeight: 140,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  deptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${PrimaryColors.main}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  deptText: {
    fontSize: 13,
    fontWeight: '700',
    color: PrimaryColors.main,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    flexShrink: 0,
    marginLeft: 4,
  },
  compactInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  compactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  compactInfoText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  compactDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    minWidth: 0,
  },
  compactDateText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  compactLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    minWidth: 0,
  },
  compactLocationText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    flex: 1,
    flexShrink: 1,
  },
  compactStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.border,
  },
  compactStatusStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  compactStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactStatText: {
    fontSize: 11,
    color: NeutralColors.textPrimary,
    fontWeight: '600',
  },
  compactApplicants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  compactAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAvatar: {
    borderWidth: 0,
    width: 24,
    height: 24,
    overflow: 'hidden',
  },
  compactMoreAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: NeutralColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactMoreAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: NeutralColors.textSecondary,
  },
  compactApplicantsText: {
    fontSize: 11,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
    marginLeft: 4,
  },
  compactPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: `${PrimaryColors.accent}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactPaymentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: PrimaryColors.accent,
  },
  formCard: {
    margin: 20,
    borderRadius: 12,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '500', marginBottom: 10, color: '#111827' },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '400',
  },
  input: {
    borderWidth: 1.5,
    borderColor: NeutralColors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: NeutralColors.cardBackground,
    color: NeutralColors.textPrimary,
    fontWeight: '500',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  workTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  workTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: NeutralColors.cardBackground,
    borderWidth: 1,
    borderColor: NeutralColors.border,
  },
  workTypeText: { fontSize: 14, fontWeight: '600' },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  locationButtonText: { fontSize: 14, fontWeight: '600' },
  salaryRow: { flexDirection: 'row', gap: 12 },
  salaryInput: { flex: 1 },
  submitButton: { marginTop: 8 },
  mapHint: {
    fontSize: 12,
    color: NeutralColors.textTertiary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: PrimaryColors.lightest,
    borderRadius: 8,
    gap: 8,
  },
  locationDisplayText: {
    fontSize: 13,
    color: PrimaryColors.dark,
    fontWeight: '600',
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: NeutralColors.divider,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
  },
  modalConfirmButton: {
    backgroundColor: StatusColors.error,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  viewApplicationsButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
      viewApplicationsText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
      },
      liveTrackingButton: {
        borderRadius: 20,
        marginBottom: 24,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      },
      liveTrackingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 16,
      },
      liveTrackingText: {
        flex: 1,
      },
      liveTrackingTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
        marginBottom: 4,
      },
      liveTrackingSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  defaultLocationCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  defaultLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultLocationText: {
    flex: 1,
  },
  defaultLocationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  defaultLocationAddress: {
    fontSize: 13,
    color: '#3B82F6',
    marginBottom: 2,
  },
  coordinateText: {
    fontSize: 11,
    color: '#60A5FA',
  },
  changeLocationButton: {
    borderColor: PrimaryColors.main,
  },
  customLocationContainer: {
    marginTop: 8,
  },
  customLocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  useCurrentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  useCurrentLocationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resetLocationText: {
    color: PrimaryColors.main,
    fontSize: 13,
    fontWeight: '600',
  },
  workCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      marginRight: 16,
      width: 300,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
  },
  workHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
      gap: 12,
  },
  workAvatar: {
      borderWidth: 0,
      overflow: 'hidden',
  },
  workDoctorInfo: {
      flex: 1,
      gap: 6,
  },
  workDoctorName: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: 4,
  },
  workMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  workDept: {
      fontSize: 13,
      color: '#64748B',
      fontWeight: '500',
  },
  workStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
      flexWrap: 'wrap',
  },
  workStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 6,
  },
  statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
  },
  workStatusText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  paymentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
  },
  paymentBadgeText: {
      fontSize: 11,
      fontWeight: '600',
  },
  workDetails: {
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
  },
  workDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  workDetailText: {
      fontSize: 13,
      color: '#374151',
      fontWeight: '500',
  },
});
