import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Calendar,
  Navigation,
  Clock,
  CheckCircle
} from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { ModernColors } from '@/constants/modern-theme';
import { useSafeBottomPadding } from '@/components/screen-safe-area';
import API from '../api';

const { width } = Dimensions.get('window');

export default function UpcomingJobsScreen() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const safeBottomPadding = useSafeBottomPadding();

  useEffect(() => {
    loadUpcomingJobs();
  }, []);

  const loadUpcomingJobs = async () => {
    try {
      setLoading(true);
      const response = await API.get('/doctor/applications');
      const allApplications = response.data.applications || [];
      
      // Filter for upcoming jobs (future dates, not today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcomingJobs = allApplications.filter((app: any) => {
        // Must be approved/selected
        if (app.status !== 'selected') return false;
        
        // Must have a job session
        if (!app.job_session) return false;
        
        // Exclude completed or cancelled sessions
        if (app.job_session.status === 'completed' || app.job_session.status === 'cancelled') {
          return false;
        }
        
        // Filter for future dates only (not today)
        let workDate: Date | null = null;
        if (app.job_session?.session_date) {
          workDate = new Date(app.job_session.session_date);
        } else if (app.job_requirement?.work_required_date) {
          workDate = new Date(app.job_requirement.work_required_date);
        } else if (app.available_date) {
          workDate = new Date(app.available_date);
        }
        
        if (!workDate) return false;
        workDate.setHours(0, 0, 0, 0);
        return workDate > today;
      });
      
      // Sort by date
      upcomingJobs.sort((a: any, b: any) => {
        let dateA: Date | null = null;
        let dateB: Date | null = null;
        
        if (a.job_requirement?.work_required_date) {
          dateA = new Date(a.job_requirement.work_required_date);
        } else if (a.job_session?.session_date) {
          dateA = new Date(a.job_session.session_date);
        }
        
        if (b.job_requirement?.work_required_date) {
          dateB = new Date(b.job_requirement.work_required_date);
        } else if (b.job_session?.session_date) {
          dateB = new Date(b.job_session.session_date);
        }
        
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
      
      setApplications(upcomingJobs);
    } catch (error: any) {
      console.error('Error loading upcoming jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkDate = (app: any) => {
    if (app.job_requirement?.work_required_date) {
      return new Date(app.job_requirement.work_required_date);
    } else if (app.job_session?.session_date) {
      return new Date(app.job_session.session_date);
    } else if (app.available_date) {
      return new Date(app.available_date);
    }
    return null;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={ModernColors.primary.main} />
        <LinearGradient
            colors={ModernColors.primary.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upcoming Jobs</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading upcoming jobs...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ModernColors.primary.main} />
      <LinearGradient
          colors={ModernColors.primary.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Jobs</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {applications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={64} color={NeutralColors.textSecondary} />
            <Text style={styles.emptyTitle}>No Upcoming Jobs</Text>
            <Text style={styles.emptyText}>
              You don't have any upcoming jobs scheduled.
            </Text>
          </View>
        ) : (
          applications.map((application) => {
            const hospital = application.job_requirement?.hospital;
            const session = application.job_session;
            const workDate = getWorkDate(application);
            // Check-in is needed if: application is approved (selected) AND not checked in yet
            const needsCheckIn = application?.status === 'selected' && !session?.check_in_time;
            const isCheckedIn = session?.check_in_time;

            return (
              <TouchableOpacity
                key={application.id}
                style={styles.jobCard}
                onPress={() => {
                  // Always navigate to job detail
                  router.push(`/(tabs)/job-detail/${application.id}`);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.jobCardHeader}>
                  {hospital?.logo_url ? (
                    <Image
                      source={{ uri: hospital.logo_url }}
                      style={styles.hospitalLogo}
                    />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Building2 size={24} color={PrimaryColors.main} />
                    </View>
                  )}
                  <View style={styles.jobInfo}>
                    <Text style={styles.hospitalName} numberOfLines={1}>
                      {hospital?.name || 'Hospital'}
                    </Text>
                    <Text style={styles.department} numberOfLines={1}>
                      {application.job_requirement?.department || 'Department'}
                    </Text>
                  </View>
                  {isCheckedIn ? (
                    <View style={styles.statusBadge}>
                      <CheckCircle size={16} color={StatusColors.success} />
                      <Text style={[styles.statusText, { color: StatusColors.success }]}>
                        Checked In
                      </Text>
                    </View>
                  ) : needsCheckIn ? (
                    <View style={styles.statusBadge}>
                      <Clock size={16} color={StatusColors.warning} />
                      <Text style={[styles.statusText, { color: StatusColors.warning }]}>
                        Check In
                      </Text>
                    </View>
                  ) : null}
                </View>

                {workDate && (
                  <View style={styles.dateRow}>
                    <Calendar size={16} color={PrimaryColors.main} />
                    <Text style={styles.dateText}>
                      {formatDate(workDate)}
                    </Text>
                  </View>
                )}

                {(application.job_requirement?.address || application.job_requirement?.latitude || hospital?.address) && (
                  <View style={styles.addressRow}>
                    <MapPin size={14} color={NeutralColors.textSecondary} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {application.job_requirement?.address || (application.job_requirement?.latitude ? "Custom Location" : hospital?.address)}
                    </Text>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => {
                      // Always navigate to job detail
                      router.push(`/(tabs)/job-detail/${application.id}`);
                    }}
                  >
                    <Navigation size={16} color={PrimaryColors.main} />
                    <Text style={styles.viewButtonText}>
                      {isCheckedIn ? 'View Session' : 'View Details'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    // Gradient handles background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  scrollContainer: {
    padding: 20,
    // paddingBottom is now set dynamically using safeBottomPadding
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hospitalLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: PrimaryColors.lightest,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: PrimaryColors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '700',
    color: PrimaryColors.dark,
    marginBottom: 4,
  },
  department: {
    fontSize: 13,
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: NeutralColors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: PrimaryColors.lightest,
  },
  viewButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: StatusColors.success + '15',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});

