import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  Alert,
  AppState,
  Dimensions,
  Platform,
} from "react-native";
import { Star, Bell, MapPin, Clock, TrendingUp, Award, Building2, CheckCircle, ArrowRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { ModernColors, Spacing, BorderRadius, Shadows, Typography } from "@/constants/modern-theme";
import { logoutDoctor, getDoctorInfo, isDoctorLoggedIn, getDoctorToken, saveDoctorAuth, getProfilePhotoUrl } from "@/utils/auth";
import API from "../api";
import { ScreenSafeArea, useSafeBottomPadding } from "@/components/screen-safe-area";
import { ModernCard } from "@/components/modern-card";

const { width } = Dimensions.get('window');

export default function DoctorHome() {
  const [doctor, setDoctor] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [jobRequirements, setJobRequirements] = useState<any[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const safeBottomPadding = useSafeBottomPadding();

  const loadDoctor = async () => {
    try {
      const isLoggedIn = await isDoctorLoggedIn();
      if (!isLoggedIn) {
        router.replace('/login');
        return;
      }

      try {
        const response = await API.get('/doctor/profile');
        if (response.data?.doctor) {
          const token = await getDoctorToken();
          if (token) {
            await saveDoctorAuth(token, response.data.doctor);
          }
          setDoctor(response.data.doctor);
          if (response.data.doctor.average_rating) {``
            setRating(response.data.doctor.average_rating);
          }
          if (response.data.doctor.completed_jobs_count !== undefined) {
            setCompletedJobsCount(response.data.doctor.completed_jobs_count);
          }
          return;
        }
      } catch (apiError) {
        console.log('⚠️ API fetch failed, using cached data:', apiError);
      }

      const info = await getDoctorInfo();
      if (info) {
        setDoctor(info);
        if (info.average_rating) {
          setRating(info.average_rating);
        }
        if (info.completed_jobs_count !== undefined) {
          setCompletedJobsCount(info.completed_jobs_count);
        }
      } else {
        router.replace('/login');
      }
    } catch (error) {
      console.error("Error loading doctor:", error);
      router.replace('/login');
    }
  };

  const loadJobRequirements = async () => {
    setLoadingRequirements(true);
    try {
      const response = await API.get('/doctor/job-requirements');
      console.log('Job requirements response:', response.data);
      setJobRequirements(response.data.requirements || []);
    } catch (error: any) {
      console.error("Error loading job requirements:", error);
      console.error("Error details:", error.response?.data || error.message);
      setJobRequirements([]);
    } finally {
      setLoadingRequirements(false);
    }
  };

  const loadMyApplications = async () => {
    setLoadingApplications(true);
    try {
      const response = await API.get('/doctor/applications');
      const applications = response.data.applications || [];
      setMyApplications(applications);
      
      const active = applications.filter((app: any) => 
        app.status === 'selected' && app.job_session?.status === 'active'
      ).length;
      setActiveJobsCount(active);
    } catch (error) {
      console.error("Error loading applications:", error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await API.get('/doctor/notifications');
      const unreadCount = response.data.notifications?.filter((n: any) => !n.read_at).length || 0;
      setNotificationCount(unreadCount);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleApply = async (requirementId: number) => {
    try {
      await API.post('/doctor/apply', {
        job_requirement_id: requirementId,
      });
      Alert.alert('Success', 'Application submitted successfully!');
      loadJobRequirements();
      loadMyApplications();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit application';
      Alert.alert('Error', message);
    }
  };

  useEffect(() => {
    loadDoctor();
    loadJobRequirements();
    loadMyApplications();
    loadNotifications();
    
    const notificationInterval = setInterval(() => {
      loadNotifications();
    }, 30000);
    
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadDoctor();
        loadJobRequirements();
        loadMyApplications();
        loadNotifications();
      }
    });
    return () => {
      subscription.remove();
      clearInterval(notificationInterval);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDoctor();
      loadJobRequirements();
      loadMyApplications();
      loadNotifications();
    }, [])
  );

  const renderStars = (count: number, total: number = 5) => {
    return (
      <View style={styles.starsContainer}>
        {Array.from({ length: total }).map((_, i) => (
          <Star
            key={i}
            size={14}
            color={i < count ? "#FFB800" : ModernColors.neutral.gray300}
            fill={i < count ? "#FFB800" : "transparent"}
          />
        ))}
        <Text style={styles.ratingText}>{count.toFixed(1)}</Text>
      </View>
    );
  };

  const upcomingApplications = myApplications.filter((app: any) => {
    if (app.status !== 'selected') return false;
    let taskDate: Date | null = null;
    if (app.job_requirement?.work_required_date) {
      taskDate = new Date(app.job_requirement.work_required_date);
    } else if (app.job_session?.session_date) {
      taskDate = new Date(app.job_session.session_date);
    } else if (app.available_date) {
      taskDate = new Date(app.available_date);
    } else {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate >= today;
  });

  const stats = [
    { 
      label: "Active Jobs", 
      value: activeJobsCount.toString(), 
      icon: Building2, 
      iconColor: ModernColors.primary.main,
      iconBg: ModernColors.primary.light,
      accentColor: ModernColors.primary.main,
      navigate: '/active-jobs'
    },
    { 
      label: "Upcoming", 
      value: upcomingApplications.length.toString(), 
      icon: Clock, 
      iconColor: ModernColors.secondary.main,
      iconBg: ModernColors.secondary.light,
      accentColor: ModernColors.secondary.main,
      navigate: '/upcoming-jobs'
    },
    { 
      label: "Rating", 
      value: rating > 0 ? rating.toFixed(1) : "0.0", 
      icon: Star, 
      iconColor: ModernColors.primary.dark,
      iconBg: ModernColors.primary.light,
      accentColor: ModernColors.primary.dark,
      navigate: null
    },
    { 
      label: "Completed", 
      value: completedJobsCount.toString(), 
      icon: CheckCircle, 
      iconColor: ModernColors.secondary.dark,
      iconBg: ModernColors.secondary.light,
      accentColor: ModernColors.secondary.dark,
      navigate: null
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <ScreenSafeArea backgroundColor={ModernColors.background.secondary} excludeBottom={true}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={ModernColors.primary.main} />
        
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={ModernColors.primary.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                <Image
                  key={getProfilePhotoUrl(doctor)}
                  source={{ uri: getProfilePhotoUrl(doctor) }}
                  style={styles.profileImage}
                />
                <View style={styles.verifiedBadge}>
                  <Award size={12} color="#fff" fill="#fff" />
                </View>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.greetingText}>{getGreeting()}</Text>
                <Text style={styles.doctorName}>{doctor?.name || "Dr. User"}</Text>
                {rating > 0 && renderStars(rating)}
              </View>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
            >
              <Bell size={22} color="#fff" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>
                    {notificationCount > 99 ? '99+' : notificationCount.toString()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: safeBottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Modern Stats Grid - 2x2 Layout */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              const isClickable = stat.navigate !== null;
              
              const StatContent = (
                <ModernCard variant="elevated" padding="none" style={styles.statCard}>
                  <View style={styles.statCardContent}>
                    <View style={[styles.statIconContainer, { backgroundColor: stat.iconBg }]}>
                      <IconComponent size={22} color={stat.iconColor} />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={[styles.statValue, { color: stat.accentColor }]}>{stat.value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                    {stat.navigate && (
                      <View style={[styles.statAccent, { backgroundColor: stat.accentColor }]} />
                    )}
                  </View>
                </ModernCard>
              );

              if (isClickable) {
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => router.push(stat.navigate as any)}
                    activeOpacity={0.8}
                    style={styles.statCardWrapper}
                  >
                    {StatContent}
                  </TouchableOpacity>
                );
              }
              
              return (
                <View key={index} style={styles.statCardWrapper}>
                  {StatContent}
                </View>
              );
            })}
          </View>

          {/* New Openings Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <TrendingUp size={20} color={ModernColors.primary.main} />
                <Text style={styles.sectionTitle}>New Opportunities</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {loadingRequirements ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading opportunities...</Text>
              </View>
            ) : jobRequirements.length === 0 ? (
              <ModernCard variant="outlined" padding="lg" style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {doctor?.department_id 
                    ? 'No job openings available in your department at the moment' 
                    : 'No job openings available. Please set your department in your profile to see relevant jobs.'}
                </Text>
              </ModernCard>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.openingsScroll}
                contentContainerStyle={styles.openingsScrollContent}
              >
                {jobRequirements.slice(0, 5).map((requirement) => {
                  const application = myApplications.find(
                    (app: any) => app.job_requirement_id === requirement.id
                  );
                  const hasApplied = !!application;
                  const applicationStatus = application?.status || null;
                  
                  return (
                    <ModernCard key={requirement.id} variant="elevated" style={styles.openingCard}>
                      <View style={styles.openingHeader}>
                        {requirement.hospital?.logo_url ? (
                          <Image
                            source={{ uri: requirement.hospital.logo_url }}
                            style={styles.hospitalLogo}
                          />
                        ) : (
                          <View style={[styles.hospitalLogoPlaceholder, { backgroundColor: ModernColors.primary.light }]}>
                            <Building2 size={20} color={ModernColors.primary.main} />
                          </View>
                        )}
                        <View style={styles.openingHeaderText}>
                          <Text style={styles.hospitalName} numberOfLines={1}>
                            {requirement.hospital?.name || 'Hospital'}
                          </Text>
                          <Text style={styles.departmentName} numberOfLines={1}>
                            {requirement.department}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.openingDetails}>
                        <View style={styles.detailRow}>
                          <Clock size={14} color={ModernColors.text.secondary} />
                          <Text style={styles.detailText}>{requirement.required_sessions} sessions</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MapPin size={14} color={ModernColors.text.secondary} />
                          <Text style={styles.detailText} numberOfLines={1}>
                            {requirement.location || 'Location TBD'}
                          </Text>
                        </View>
                      </View>

                      {hasApplied ? (
                        <View style={[styles.applyButton, styles.appliedButton]}>
                          <Text style={styles.appliedButtonText}>
                            {applicationStatus === 'pending' ? 'Waiting for Approval' : 
                             applicationStatus === 'selected' ? 'Approved' :
                             applicationStatus === 'rejected' ? 'Rejected' : 'Applied'}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.applyButton, { backgroundColor: ModernColors.primary.main }]}
                          onPress={() => handleApply(requirement.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.applyButtonText}>Apply Now</Text>
                          <ArrowRight size={16} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </ModernCard>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Upcoming Tasks */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Clock size={20} color={ModernColors.primary.main} />
                <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
              </View>
            </View>

            {loadingApplications ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading tasks...</Text>
              </View>
            ) : upcomingApplications.length === 0 ? (
              <ModernCard variant="outlined" padding="lg" style={styles.emptyCard}>
                <Text style={styles.emptyText}>No upcoming tasks scheduled</Text>
              </ModernCard>
            ) : (
              <View style={styles.tasksContainer}>
                {upcomingApplications.slice(0, 3).map((app: any) => {
                  const taskDate = app.job_requirement?.work_required_date 
                    ? new Date(app.job_requirement.work_required_date)
                    : app.job_session?.session_date 
                    ? new Date(app.job_session.session_date)
                    : null;
                  
                  return (
                    <ModernCard key={app.id} variant="elevated" padding="md" style={styles.taskCard}>
                      <View style={styles.taskHeader}>
                        <View style={[styles.taskIconContainer, { backgroundColor: ModernColors.secondary.light }]}>
                          <Building2 size={20} color={ModernColors.secondary.main} />
                        </View>
                        <View style={styles.taskInfo}>
                          <Text style={styles.taskHospital} numberOfLines={1}>
                            {app.job_requirement?.hospital?.name || 'Hospital'}
                          </Text>
                          <Text style={styles.taskDepartment} numberOfLines={1}>
                            {app.job_requirement?.department || 'Department'}
                          </Text>
                        </View>
                      </View>
                      {taskDate && (
                        <View style={styles.taskDateContainer}>
                          <Clock size={14} color={ModernColors.text.secondary} />
                          <Text style={styles.taskDate}>
                            {taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.taskButton}
                        onPress={() => router.push(`/job-detail/${app.id}`)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.taskButtonText}>View Details</Text>
                        <ArrowRight size={16} color={ModernColors.primary.main} />
                      </TouchableOpacity>
                    </ModernCard>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ModernColors.background.secondary,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 50,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ModernColors.primary.dark,
    borderWidth: 3,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: ModernColors.success.main,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  greetingText: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  doctorName: {
    ...Typography.h3,
    color: '#fff',
    marginBottom: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...Typography.small,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: ModernColors.error.main,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    // paddingBottom is now set dynamically using safeBottomPadding
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCardWrapper: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    aspectRatio: 1,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    backgroundColor: ModernColors.background.primary,
    borderWidth: 1,
    borderColor: ModernColors.border.light,
    overflow: 'hidden',
    position: 'relative',
  },
  statCardContent: {
    width: '100%',
    height: '100%',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    position: 'relative',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
    paddingTop: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    marginBottom: 6,
    letterSpacing: -0.5,
    color: ModernColors.text.primary,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: ModernColors.text.secondary,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  statAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: ModernColors.text.primary,
  },
  seeAllText: {
    ...Typography.captionBold,
    color: ModernColors.primary.main,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: ModernColors.text.secondary,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: ModernColors.text.secondary,
    textAlign: 'center',
  },
  openingsScroll: {
    marginHorizontal: -Spacing.lg,
  },
  openingsScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  openingCard: {
    width: width * 0.75,
    minWidth: 280,
  },
  openingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  hospitalLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  hospitalLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openingHeaderText: {
    flex: 1,
  },
  hospitalName: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    marginBottom: 2,
  },
  departmentName: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
  },
  openingDetails: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    flex: 1,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  appliedButton: {
    backgroundColor: ModernColors.neutral.gray200,
  },
  applyButtonText: {
    ...Typography.captionBold,
    color: '#fff',
  },
  appliedButtonText: {
    ...Typography.captionBold,
    color: ModernColors.text.secondary,
  },
  tasksContainer: {
    gap: Spacing.md,
  },
  taskCard: {
    marginBottom: Spacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  taskInfo: {
    flex: 1,
  },
  taskHospital: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    marginBottom: 2,
  },
  taskDepartment: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
  },
  taskDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  taskDate: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
  },
  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  taskButtonText: {
    ...Typography.captionBold,
    color: ModernColors.primary.main,
  },
});
