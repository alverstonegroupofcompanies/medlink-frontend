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
import { Star, Bell, MapPin, Clock, TrendingUp, Award, Building2, CheckCircle, ArrowRight, Calendar, AlertCircle, Phone, Navigation } from "lucide-react-native";
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
  const [jobSessions, setJobSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Loading states
  const hasLoaded = React.useRef(false);
  const [refreshing, setRefreshing] = useState(false);


  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
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
          if (response.data.doctor.average_rating) {
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

  const loadJobRequirements = async (silent = false) => {
    if (!silent && !hasLoaded.current) setLoadingRequirements(true);
    try {
      const response = await API.get('/doctor/job-requirements');
      console.log('Job requirements response:', response.data);
      setJobRequirements(response.data.requirements || []);
    } catch (error: any) {
      console.error("Error loading job requirements:", error);
      console.error("Error details:", error.response?.data || error.message);
      setJobRequirements([]);
    } finally {
      if (!silent) setLoadingRequirements(false);
    }
  };

  const loadMyApplications = async (silent = false) => {
    if (!silent && !hasLoaded.current) setLoadingApplications(true);
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
      if (!silent) setLoadingApplications(false);
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

  const loadJobSessions = async (silent = false) => {
    if (!silent && !hasLoaded.current) setLoadingSessions(true);
    try {
      const response = await API.get('/doctor/sessions');
      console.log('📋 Job Sessions Response:', response.data);
      console.log('📋 First Session Sample:', response.data.sessions?.[0]);
      if (response.data.sessions?.[0]) {
        console.log('  🏥 Hospital:', response.data.sessions[0].job_requirement?.hospital);
        console.log('  🏢 Department:', response.data.sessions[0].job_requirement?.department);
        console.log('  📅 Session Date:', response.data.sessions[0].session_date);
        console.log('  ✅ Check-in Time:', response.data.sessions[0].check_in_time);
        console.log('  📊 Status:', response.data.sessions[0].status);
      }
      setJobSessions(response.data.sessions || []);
    } catch (error) {
      console.error("Error loading job sessions:", error);
      setJobSessions([]);
    } finally {
      if (!silent) setLoadingSessions(false);
    }
  };

  const generateWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      week.push(date);
    }
    setWeekDates(week);
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
    loadJobSessions();
    generateWeekDates();
    
    const notificationInterval = setInterval(() => {
      loadNotifications();
    }, 30000);
    
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadDoctor();
        loadJobRequirements();
        loadMyApplications();
        loadNotifications();
        loadJobSessions();
      }
    });
    return () => {
      subscription.remove();
      clearInterval(notificationInterval);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        // First load (silent=false), subsequent loads (silent=true)
        const silent = hasLoaded.current;
        
        await Promise.all([
          loadDoctor(),
          loadJobRequirements(silent),
          loadMyApplications(silent),
          loadNotifications(),
          loadJobSessions(silent)
        ]);
        
        hasLoaded.current = true;
      };

      refreshData();
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

  // Calculate session metrics
  const activeSessions = jobSessions.filter((session: any) => session.status === 'in_progress');
  const todaySessions = jobSessions.filter((session: any) => {
    if (!session.session_date) return false;
    const sessionDate = new Date(session.session_date);
    const today = new Date();
    sessionDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime();
  });

  // Calculate issues: late check-ins, missing check-outs, etc.
  const issuesCount = jobSessions.filter((session: any) => {
    const now = new Date();
    const sessionDate = session.session_date ? new Date(session.session_date) : null;
    
    // Late check-in: session date/time passed but no check_in_time
    if (sessionDate && sessionDate < now && !session.check_in_time && session.status === 'scheduled') {
      return true;
    }
    
    // Missing check-out: status is in_progress for more than expected duration
    if (session.status === 'in_progress' && session.check_in_time) {
      const checkInTime = new Date(session.check_in_time);
      const hoursSinceCheckIn = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCheckIn > 12) return true; // Arbitrary threshold
    }
    
    return false;
  }).length;

  // Attention needed sessions - ONLY missed check-ins (approved but didn't check in after scheduled time)
  const attentionNeeded = jobSessions.filter((session: any) => {
    const now = new Date();
    
    if (!session.session_date) return false;
    
    // Combine session_date and start_time to get actual session datetime
    let sessionDateTime = new Date(session.session_date);
    
    // If start_time is available, set the time component
    if (session.job_requirement?.start_time) {
      const [hours, minutes] = session.job_requirement.start_time.split(':');
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    // Show if:
    // 1. Approved (status is 'scheduled')
    // 2. No check-in yet
    // 3. Either session time has passed OR session is coming up soon (within 24 hours)
    if (session.status === 'scheduled' && !session.check_in_time) {
      const hoursDiff = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Show if session time passed OR if it's within 24 hours
      if (sessionDateTime < now || (hoursDiff > 0 && hoursDiff < 24)) {
        return true;
      }
    }
    
    return false;
  });

  const stats = [
    { 
      label: "Total Shifts", 
      value: jobSessions.length.toString(), 
      icon: Building2, 
      iconColor: ModernColors.primary.main,
      iconBg: ModernColors.primary.light,
      accentColor: ModernColors.primary.main,
      navigate: null
    },
    { 
      label: "Active Now", 
      value: activeSessions.length.toString(), 
      icon: TrendingUp, 
      iconColor: ModernColors.success.main,
      iconBg: ModernColors.success.light,
      accentColor: ModernColors.success.main,
      navigate: '/active-jobs',
      pulse: activeSessions.length > 0
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
      label: "Issues", 
      value: issuesCount.toString(), 
      icon: AlertCircle, 
      iconColor: ModernColors.error.main,
      iconBg: ModernColors.error.light,
      accentColor: ModernColors.error.main,
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
    <ScreenSafeArea 
      backgroundColor={ModernColors.primary.main} 
      excludeBottom={true}
      statusBarStyle="light-content"
    >
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
          {/* Calendar Week View */}
          <View style={styles.calendarSection}>
            <View style={styles.calendarHeader}>
              <Calendar size={20} color={ModernColors.text.primary} />
              <Text style={styles.calendarTitle}>Shift Schedule</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekDaysContainer}
            >
              {weekDates.map((date, index) => {
                const isToday = new Date().toDateString() === date.toDateString();
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index];
                const dayNumber = date.getDate();
                
                // Check if this date has sessions
                const hasSession = jobSessions.some((session: any) => {
                  if (!session.session_date) return false;
                  const sessionDate = new Date(session.session_date);
                  return sessionDate.toDateString() === date.toDateString();
                });
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCard,
                      isToday && styles.dayCardToday,
                      isSelected && styles.dayCardSelected
                    ]}
                    onPress={() => setSelectedDate(date)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayName,
                      (isToday || isSelected) && styles.dayNameActive
                    ]}>{dayName}</Text>
                    <Text style={[
                      styles.dayNumber,
                      (isToday || isSelected) && styles.dayNumberActive
                    ]}>{dayNumber}</Text>
                    {hasSession && (
                      <View style={[
                        styles.sessionIndicator,
                        isToday && styles.sessionIndicatorToday
                      ]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

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

          {/* Attention Needed Section */}
          {attentionNeeded.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <AlertCircle size={20} color={ModernColors.error.main} />
                  <Text style={[styles.sectionTitle, { color: ModernColors.error.main }]}>Attention Needed</Text>
                </View>
              </View>
              
              <View style={styles.attentionContainer}>
                {attentionNeeded.map((session: any) => {
                  const now = new Date();
                  
                  // Combine session_date and start_time to get actual session datetime
                  let sessionDateTime = new Date(session.session_date);
                  if (session.job_requirement?.start_time) {
                    const [hours, minutes] = session.job_requirement.start_time.split(':');
                    sessionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                  }
                  
                  // Check if session time has actually passed
                  const isActuallyLate = sessionDateTime < now && !session.check_in_time;
                  const isUpcoming = sessionDateTime >= now;
                  
                  return (
                    <ModernCard key={session.id} variant="elevated" padding="md" style={styles.attentionCard}>
                      <View style={styles.attentionHeader}>
                        <View style={styles.attentionInfo}>
                          <View style={styles.attentionTitleRow}>
                            <Text style={styles.attentionHospital} numberOfLines={1}>
                              {session.job_requirement?.hospital?.name || 'Hospital'}
                            </Text>
                            <View style={[
                              styles.lateBadge, 
                              isUpcoming && styles.upcomingBadge
                            ]}>
                              <Text style={styles.lateBadgeText}>
                                {isUpcoming ? "DON'T MISS OUT" : 'MISSED CHECK-IN'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.attentionDepartment} numberOfLines={1}>
                            {session.job_requirement?.department || 'Department'}
                          </Text>
                          {sessionDateTime && (
                            <View style={styles.attentionDateTimeContainer}>
                              <View style={styles.attentionDateRow}>
                                <Calendar size={14} color={isUpcoming ? ModernColors.warning.main : ModernColors.error.main} />
                                <Text style={[
                                  styles.attentionDate,
                                  isUpcoming && styles.attentionDateUpcoming
                                ]}>
                                  {sessionDateTime.toLocaleDateString('en-IN', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </Text>
                              </View>
                              {session.job_requirement?.start_time && (
                                <View style={styles.attentionTimeContainer}>
                                  <Clock size={14} color={isUpcoming ? ModernColors.warning.main : ModernColors.error.main} />
                                  <Text style={[
                                    styles.attentionTime,
                                    isUpcoming && styles.attentionTimeUpcoming
                                  ]}>
                                    {new Date(`2000-01-01 ${session.job_requirement.start_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.attentionActions}>
                        <TouchableOpacity
                          style={styles.attentionCallButton}
                          onPress={() => {
                            // TODO: Implement call functionality
                            Alert.alert('Call', `Calling ${session.job_requirement?.hospital?.name}`);
                          }}
                        >
                          <Phone size={16} color={ModernColors.primary.main} />
                          <Text style={styles.attentionCallText}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.attentionViewButton}
                          onPress={() => {
                            if (session.application_id) {
                              router.push(`/job-detail/${session.application_id}`);
                            } else {
                              console.warn("No application ID for session:", session.id);
                            }
                          }}
                        >
                          <Text style={styles.attentionViewText}>View Details</Text>
                          <ArrowRight size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </ModernCard>
                  );
                })}
              </View>
            </View>
          )}

          {/* New Opportunities Section */}
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
                  const isExpired = requirement.is_expired || false;
                  
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.hospitalName} numberOfLines={1}>
                              {requirement.hospital?.name || 'Hospital'}
                            </Text>
                            {isExpired && (
                              <View style={styles.expiredBadge}>
                                <Text style={styles.expiredBadgeText}>EXPIRED</Text>
                              </View>
                            )}
                          </View>
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
                          <View style={styles.requirementInfoRow}>
                            <MapPin size={14} color={ModernColors.text.secondary} />
                            <Text style={styles.requirementInfoText} numberOfLines={1}>
                            {requirement.address || (requirement.latitude ? "Custom Location" : requirement.location || requirement.hospital?.address || 'Location not specified')}
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
                      ) : isExpired ? (
                        <View style={[styles.applyButton, styles.expiredButton]}>
                          <Text style={styles.expiredButtonText}>Expired</Text>
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
  expiredBadge: {
    backgroundColor: ModernColors.error.main,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  expiredBadgeText: {
    ...Typography.caption,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  expiredButton: {
    backgroundColor: ModernColors.neutral.gray300,
  },
  expiredButtonText: {
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
  // Calendar Section Styles
  calendarSection: {
    marginBottom: Spacing.xl,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  calendarTitle: {
    ...Typography.h3,
    color: ModernColors.text.primary,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: 2,
  },
  dayCard: {
    width: 72,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: ModernColors.background.primary,
    borderWidth: 1,
    borderColor: ModernColors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCardToday: {
    borderColor: ModernColors.primary.main,
    borderWidth: 2,
  },
  dayCardSelected: {
    backgroundColor: ModernColors.primary.main,
    borderColor: ModernColors.primary.main,
  },
  dayName: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    marginBottom: 4,
    fontSize: 12,
  },
  dayNameActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dayNumber: {
    ...Typography.h3,
    color: ModernColors.text.primary,
  },
  dayNumberActive: {
    color: '#fff',
  },
  sessionIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ModernColors.primary.main,
    marginTop: 4,
  },
  sessionIndicatorToday: {
    backgroundColor: '#fff',
  },
  // Attention Needed Section Styles
  attentionContainer: {
    gap: Spacing.md,
  },
  attentionCard: {
    borderLeftWidth: 4,
    borderLeftColor: ModernColors.error.main,
  },
  attentionHeader: {
    marginBottom: Spacing.sm,
  },
  attentionInfo: {
    flex: 1,
  },
  attentionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  attentionHospital: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  lateBadge: {
    backgroundColor: ModernColors.error.main,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  upcomingBadge: {
    backgroundColor: ModernColors.warning.main,
  },
  lateBadgeText: {
    ...Typography.caption,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  attentionDepartment: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    marginBottom: 6,
  },
  attentionDateTimeContainer: {
    gap: Spacing.xs,
  },
  attentionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  attentionDate: {
    ...Typography.captionBold,
    color: ModernColors.error.main,
  },
  attentionDateUpcoming: {
    color: ModernColors.warning.main,
  },
  attentionTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  attentionTime: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
  },
  attentionTimeUpcoming: {
    color: ModernColors.warning.main,
    fontWeight: '600',
  },
  attentionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  attentionCallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: ModernColors.primary.main,
    backgroundColor: ModernColors.background.primary,
  },
  attentionCallText: {
    ...Typography.captionBold,
    color: ModernColors.primary.main,
  },
  attentionViewButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: ModernColors.primary.main,
  },
  attentionViewText: {
    ...Typography.captionBold,
    color: '#fff',
  },
  requirementInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  requirementInfoText: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    flex: 1,
  },
});
