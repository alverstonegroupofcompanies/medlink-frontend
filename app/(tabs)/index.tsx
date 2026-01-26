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
  DeviceEventEmitter,
  Modal,
} from "react-native";
import { Star, Bell, MapPin, Clock, TrendingUp, Award, Building2, CheckCircle, Check, ArrowRight, Calendar, AlertCircle, Phone, Navigation, LogOut, IndianRupee, Coins, Wallet } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { ModernColors, Spacing, BorderRadius, Shadows, Typography } from "@/constants/modern-theme";
import { logoutDoctor, getDoctorInfo, isDoctorLoggedIn, getDoctorToken, saveDoctorAuth, getProfilePhotoUrl } from "@/utils/auth";
import API from "../api";
import { ScreenSafeArea, useSafeBottomPadding } from "@/components/screen-safe-area";
import echo from "@/services/echo";
import { showNotificationFromData, scheduleLocalNotification } from "@/utils/notifications";

import { ModernCard } from "@/components/modern-card";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { getFullImageUrl } from "@/utils/url-helper";
import PromoCarousel from "@/components/promo-carousel";
import { Portal, Dialog, Button } from 'react-native-paper';
import { MinimalSessionCard } from "@/components/MinimalSessionCard";


const { width } = Dimensions.get('window');
const isTablet = width >= 768; // 11 inch tablet is typically 768px or more
const isLargeTablet = width >= 1024; // 10 inch tablet is typically 1024px or more
const CARD_WIDTH = 300;

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
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [expandedApplicationId, setExpandedApplicationId] = useState<number | null>(null);


  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number | null>(null);
  const safeBottomPadding = useSafeBottomPadding();
  const { startTracking, stopTracking, isTracking, permissionDialog, closePermissionDialog } = useLocationTracking();

  const loadDoctor = async () => {
    try {
      const isLoggedIn = await isDoctorLoggedIn();
      if (!isLoggedIn) {
        // Clear doctor state if not logged in
        setDoctor(null);
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
          // Set doctor state - this will trigger image reload with new key
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
        // Clear doctor state if no info found
        setDoctor(null);
        router.replace('/login');
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Error loading doctor:", error);
      }
      // Clear doctor state on error
      setDoctor(null);
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
      if (__DEV__) {
        console.error("Error loading applications:", error);
      }
    } finally {
      if (!silent) setLoadingApplications(false);
    }
  };

  const loadNotifications = async () => {
    try {
      // Try new endpoint first, fallback to old one
      let response;
      try {
        response = await API.get('/doctor/notifications/list');
      } catch (newError: any) {
        // Fallback to old endpoint if new one fails
        if (newError.response?.status === 404) {
          response = await API.get('/doctor/notifications');
        } else {
          throw newError;
        }
      }
      const unreadCount = response.data.notifications?.filter((n: any) => !n.read_at).length || 0;
      setNotificationCount(unreadCount);
    } catch (error: any) {
      // Silently handle 404 and other errors - don't show to user
      if (__DEV__) {
        if (error.response?.status === 404) {
          console.warn("Notifications endpoint not found - route may need to be registered");
        } else {
          console.error("Error loading notifications:", error);
        }
      }
      // Set count to 0 on error to prevent UI issues
      setNotificationCount(0);
    }
  };

  const loadDisputes = async () => {
    try {
      const response = await API.get('/disputes');
      setDisputes(response.data.disputes || []);
    } catch (error: any) {
      if (__DEV__) console.error('Error loading disputes:', error);
      setDisputes([]);
    }
  };

  const loadWalletSummary = async () => {
    try {
      const response = await API.get('/doctor/wallet');
      const earned = response.data?.wallet?.total_earned;
      setTotalEarnings(typeof earned === 'number' ? earned : 0);
    } catch (_) {
      setTotalEarnings(0);
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
      if (__DEV__) {
        console.error("Error loading job sessions:", error);
      }
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
      // Check if position is filled before applying
      const requirement = jobRequirements.find((req: any) => req.id === requirementId);
      if (requirement?.is_filled) {
        Alert.alert('Position Filled', 'This position has already been filled. Please look for other opportunities.');
        return;
      }

      // Check verification first (backend blocks here too; show this before "add bank details")
      if (doctor?.verification_status === 'pending') {
        Alert.alert(
          'Verification Pending',
          'Your account is pending verification. Please wait for admin approval before applying to jobs.'
        );
        return;
      }
      if (doctor?.verification_status === 'rejected') {
        Alert.alert(
          'Verification Rejected',
          'Your account verification has been rejected. Please contact admin for more information.'
        );
        return;
      }

      // Check if banking details exist before applying (from /doctor/banking-details; fallback to /doctor/profile if bank was saved at registration)
      let hasBankingDetails = false;
      try {
        const bankingResponse = await API.get('/doctor/banking-details');
        hasBankingDetails = !!bankingResponse.data?.banking_details?.has_banking_details;
      } catch (_) { /* ignore */ }
      if (!hasBankingDetails) {
        try {
          const profileRes = await API.get('/doctor/profile');
          hasBankingDetails = !!profileRes.data?.doctor?.has_banking_details;
        } catch (_) { /* ignore */ }
      }
      if (!hasBankingDetails) {
        Alert.alert(
          'Banking Details Required',
          'Please add your banking details before applying for jobs. This is required to receive payments.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Now', onPress: () => router.push('/(tabs)/wallet?openBanking=1') },
          ]
        );
        return;
      }

      await API.post(`/jobs/${requirementId}/apply`);
      Alert.alert('Success', 'Application submitted successfully!');
      loadJobRequirements();
      loadMyApplications();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit application';
      const normalized = String(message || '').toLowerCase();

      // If backend returns verification error, show that instead of banking or generic
      if (normalized.includes('verification') && normalized.includes('pending')) {
        Alert.alert(
          'Verification Pending',
          'Your account is pending verification. Please wait for admin approval before applying to jobs.'
        );
        return;
      }
      if (normalized.includes('verification') && normalized.includes('rejected')) {
        Alert.alert(
          'Verification Rejected',
          'Your account verification has been rejected. Please contact admin for more information.'
        );
        return;
      }

      // If backend blocks due to missing banking details, guide user to fix it
      if (normalized.includes('bank') || normalized.includes('ifsc') || normalized.includes('account')) {
        Alert.alert(
          'Banking Details Required',
          'Please add your banking details in Wallet before applying for jobs.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Now', onPress: () => router.push('/(tabs)/wallet?openBanking=1') },
          ]
        );
        return;
      }

      // Check if error is about position being filled
      if (normalized.includes('filled') || normalized.includes('already')) {
        Alert.alert('Position Filled', 'This position has already been filled. Please look for other opportunities.');
        loadJobRequirements();
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const handleWithdraw = async (applicationId: number) => {
    Alert.alert(
      "Withdraw Application",
      "Are you sure you want to withdraw your application?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Withdraw", 
          style: "destructive", 
          onPress: async () => {
            try {
              await API.post(`/jobs/${applicationId}/withdraw`);
              Alert.alert('Success', 'Application withdrawn successfully.');
              loadJobRequirements();
              loadMyApplications();
            } catch (error: any) {
              const message = error.response?.data?.message || 'Failed to withdraw application';
              Alert.alert('Error', message);
            }
          }
        }
      ]
    );
  };

  const handleReject = async (requirementId: number) => {
    Alert.alert(
      "Reject Appointment",
      "Are you sure you want to reject this appointment? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          style: "destructive", 
          onPress: async () => {
            try {
              await API.post(`/jobs/${requirementId}/reject`);
              Alert.alert('Success', 'Appointment rejected successfully.');
              loadJobRequirements();
              loadMyApplications();
            } catch (error: any) {
              const message = error.response?.data?.message || 'Failed to reject appointment';
              Alert.alert('Error', message);
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: async () => {
            await logoutDoctor();
            router.replace('/login');
          }
        }
      ]
    );
  };


  // Calculate session metrics
  // Active sessions: Either explicitly in_progress OR tracking has started (and not finished)
  const activeSessions = jobSessions.filter((session: any) => 
    session.status === 'in_progress' || 
    (session.tracking_started_at && !session.check_out_time && session.status !== 'completed' && session.status !== 'cancelled')
  );
  const todaySessions = jobSessions.filter((session: any) => {
    if (!session.session_date) return false;
    const sessionDate = new Date(session.session_date);
    const today = new Date();
    sessionDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime();
  });

  // Open disputes (open or under_review) – used to show Issues card with no count; on tap opens disputes list
  const openDisputes = disputes.filter((d: any) => ['open', 'under_review'].includes(d.status || ''));

  useEffect(() => {
    loadDoctor();
    loadJobRequirements();
    loadMyApplications();
    loadNotifications();
    loadJobSessions();
    loadDisputes();
    loadWalletSummary();
    generateWeekDates();
    

    
    const notificationInterval = setInterval(() => {
      loadNotifications();
    }, 30000);

    // Listen for global refresh events from _layout.tsx (for applications/sessions, not jobs)
    const refreshSubscription = DeviceEventEmitter.addListener('REFRESH_DOCTOR_DATA', () => {
        console.log('🔄 [Dashboard] Received global refresh event');
        loadMyApplications();
        loadNotifications();
        loadJobRequirements();
        loadJobSessions();
        loadDisputes();
    });

    // Listen for application status updates to change status immediately without refresh
    const applicationStatusSubscription = DeviceEventEmitter.addListener('APPLICATION_STATUS_UPDATED', (updateData: any) => {
        console.log('🔄 [Dashboard] Application status updated:', updateData);
        if (updateData && updateData.applicationId) {
            // Update application status immediately
            setMyApplications((prev: any[]) => {
                const updated = prev.map((app: any) => {
                    if (app.id === updateData.applicationId || app.job_requirement_id === updateData.requirementId) {
                        const updatedApp = {
                            ...app,
                            status: updateData.status,
                        };
                        
                        // If approved and session ID is provided, add job_session
                        if (updateData.status === 'selected' && updateData.data?.job_session_id) {
                            updatedApp.job_session = {
                                id: updateData.data.job_session_id,
                                status: 'scheduled',
                                session_date: updateData.data.session_date || app.job_requirement?.work_required_date,
                            };
                        }
                        
                        return updatedApp;
                    }
                    return app;
                });
                
                // If application not found in list, it might be a new approval - reload to get full data
                const found = updated.some((app: any) => 
                    app.id === updateData.applicationId || 
                    (app.job_requirement_id === updateData.requirementId && app.status === updateData.status)
                );
                
                if (!found) {
                    console.log('ℹ️ [Dashboard] Application not in current list, will reload');
                    // Reload applications to get the new one
                    setTimeout(() => loadMyApplications(true), 500);
                }
                
                // Update active jobs count if status changed to selected
                if (updateData.status === 'selected') {
                    const active = updated.filter((app: any) => 
                        app.status === 'selected' && app.job_session?.status === 'active'
                    ).length;
                    setActiveJobsCount(active);
                }
                
                return updated;
            });
            
            console.log('✅ [Dashboard] Application status updated in UI');
        }
    });

    // Listen for new job postings to add immediately without refresh
    const newJobSubscription = DeviceEventEmitter.addListener('NEW_JOB_POSTED', (jobRequirement: any) => {
        console.log('🆕 [Dashboard] New job posted event received:', jobRequirement);
        if (jobRequirement && jobRequirement.id) {
            // Check if this job matches doctor's departments
            const doctorDepartmentIds = doctor?.departments?.map((d: any) => 
                d.department_id || d.id || d.department?.id || d.department?.department_id
            ).filter(Boolean) || [];
            const jobDepartmentId = jobRequirement.department_id || jobRequirement.department?.id;
            const jobDepartmentName = jobRequirement.department || jobRequirement.department?.name;
            
            // More lenient filtering: show job if:
            // 1. Doctor has no departments set (show all)
            // 2. Job department ID matches any of doctor's departments
            // 3. Job department name matches any of doctor's department names
            const shouldShow = doctorDepartmentIds.length === 0 || 
                              (jobDepartmentId && doctorDepartmentIds.includes(Number(jobDepartmentId))) ||
                              (jobDepartmentId && doctorDepartmentIds.some((id: any) => Number(id) === Number(jobDepartmentId))) ||
                              (jobDepartmentName && doctor?.departments?.some((d: any) => 
                                d.name === jobDepartmentName ||
                                d.department?.name === jobDepartmentName ||
                                (d.department && d.department.name === jobDepartmentName)
                              ));
            
            if (shouldShow) {
                // Check if job already exists in the list
                setJobRequirements((prev: any[]) => {
                    const exists = prev.some((req: any) => req.id === jobRequirement.id);
                    if (!exists) {
                        // Ensure job requirement has all necessary fields
                        const newJob = {
                            ...jobRequirement,
                            // Ensure hospital is included if available
                            hospital: jobRequirement.hospital || null,
                            // Ensure is_expired is set (default to false for new jobs)
                            is_expired: jobRequirement.is_expired || false,
                            // Ensure is_active is set (default to true for new jobs)
                            is_active: jobRequirement.is_active !== undefined ? jobRequirement.is_active : true,
                        };
                        // Add new job to the beginning of the list
                        const updated = [newJob, ...prev];
                        console.log('✅ [Dashboard] New job added to opportunities list:', newJob.id, newJob.department);
                        return updated;
                    } else {
                        console.log('ℹ️ [Dashboard] Job already exists in list, updating:', jobRequirement.id);
                        // Update existing job with latest data
                        return prev.map(req => req.id === jobRequirement.id ? { ...req, ...jobRequirement } : req);
                    }
                });
            } else {
                console.log('ℹ️ [Dashboard] Job does not match doctor departments, skipping:', {
                    jobId: jobRequirement.id,
                    jobDeptId: jobDepartmentId,
                    jobDeptName: jobDepartmentName,
                    doctorDeptIds: doctorDepartmentIds
                });
            }
        } else {
            console.warn('⚠️ [Dashboard] Invalid job requirement data received:', jobRequirement);
        }
    });

    
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
      if (refreshSubscription) refreshSubscription.remove();
      applicationStatusSubscription.remove();
      newJobSubscription.remove();
      clearInterval(notificationInterval);
      stopTracking(); 
    };
  }, [doctor?.id]); // Re-run if doctor ID changes (e.g. login)

  // Auto-start tracking if there are active sessions
  useEffect(() => {
    if (activeSessions.length > 0 && !isTracking) {
        console.log("Auto-starting tracking for active session...", activeSessions[0].id);
        // Don't show permission dialogs automatically (prevents flicker).
        startTracking(activeSessions[0].id, { interactive: false });
    } else if (activeSessions.length === 0 && isTracking) {
        stopTracking();
    }
  }, [activeSessions, isTracking]);

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
          loadJobSessions(silent),
          loadDisputes(),
          loadWalletSummary(),
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
            size={12}
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
    // Exclude if already checked in
    if (app.job_session?.check_in_time) return false;
    
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
    // Issues: only when there are open disputes; no count; tap opens disputes list
    ...(openDisputes.length > 0 ? [{
      label: "Issues",
      value: "—",
      icon: AlertCircle,
      iconColor: ModernColors.error.main,
      iconBg: ModernColors.error.light,
      accentColor: ModernColors.error.main,
      navigate: '/(tabs)/disputes'
    }] : []),
  ];

  const trackingIndicator = isTracking ? (
    <View style={{ 
        backgroundColor: 'rgba(16, 185, 129, 0.2)', // More transparent/minimal background
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 4, // Add gap below
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.5)' // Subtle border
    }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 }} />
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 }}>LIVE TRACKING</Text>
    </View>
  ) : null;

  // Ensure status bar blends with header (unified blue #2563EB)
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#2563EB', true);
        StatusBar.setBarStyle('light-content', true);
        StatusBar.setTranslucent(false);
      }
    }, [])
  );

  return (
    <ScreenSafeArea 
      backgroundColor={ModernColors.primary.main} 
      excludeBottom={true}
      statusBarStyle="light-content"
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} />

        <Portal>
          <Dialog visible={permissionDialog.visible} onDismiss={closePermissionDialog}>
            <Dialog.Title>{permissionDialog.title}</Dialog.Title>
            <Dialog.Content>
              <Text style={{ color: ModernColors.text.secondary, lineHeight: 20 }}>
                {permissionDialog.message}
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={closePermissionDialog}>OK</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
        
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
                  key={`doctor-${doctor?.id || 'no-id'}-${doctor?.profile_photo || 'no-photo'}`}
                  source={{ uri: getProfilePhotoUrl(doctor) }}
                  style={styles.profileImage}
                />
                {doctor?.verification_status === 'approved' ? (
                  <View style={styles.verifiedBadge}>
                    <CheckCircle size={14} color="#fff" fill="#fff" />
                  </View>
                ) : (
                  <View style={styles.unverifiedBadge}>
                    <AlertCircle size={14} color="#fff" fill="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.doctorName}>{doctor?.name || "Dr. User"}</Text>
                {trackingIndicator}
                {rating > 0 && renderStars(rating)}
              </View>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
            >
              <Bell size={18} color="#fff" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>
                    {notificationCount > 99 ? '99+' : notificationCount.toString()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.notificationButton, { marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={handleLogout}
            >
              <LogOut size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: safeBottomPadding },
            isTablet && { maxWidth: 720, alignSelf: 'center', width: '100%' },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Reveal: Completed, Disputes, Upcomings, Total Earnings */}
          <View style={styles.quickRevealGrid}>
            <TouchableOpacity style={styles.quickRevealItem} onPress={() => router.push('/(tabs)/history')} activeOpacity={0.7}>
              <CheckCircle size={18} color={ModernColors.success.main} />
              <View style={styles.quickRevealText}>
                <Text style={styles.quickRevealValue}>{completedJobsCount}</Text>
                <Text style={styles.quickRevealLabel}>Completed</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickRevealItem} onPress={() => router.push('/(tabs)/disputes')} activeOpacity={0.7}>
              <AlertCircle size={18} color={openDisputes.length > 0 ? ModernColors.error.main : ModernColors.text.tertiary} />
              <View style={styles.quickRevealText}>
                <Text style={styles.quickRevealValue}>{openDisputes.length}</Text>
                <Text style={styles.quickRevealLabel}>Disputes</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickRevealItem} onPress={() => router.push('/(tabs)/upcoming-jobs')} activeOpacity={0.7}>
              <Clock size={18} color={ModernColors.secondary.main} />
              <View style={styles.quickRevealText}>
                <Text style={styles.quickRevealValue}>{upcomingApplications.length}</Text>
                <Text style={styles.quickRevealLabel}>Upcomings</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickRevealItem} onPress={() => router.push('/(tabs)/wallet')} activeOpacity={0.7}>
              <IndianRupee size={18} color={ModernColors.primary.main} />
              <View style={styles.quickRevealText}>
                <Text style={styles.quickRevealValue} numberOfLines={1}>
                  {totalEarnings === null ? '—' : `₹${(totalEarnings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                </Text>
                <Text style={styles.quickRevealLabel}>Total Earnings</Text>
              </View>
            </TouchableOpacity>
          </View>

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
                    onPress={() => {
                        setSelectedDate(date);
                        setScheduleModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayName,
                      (isToday || isSelected) && styles.dayNameActive,
                      isToday && !isSelected && { color: ModernColors.primary.main }
                    ]}>{dayName}</Text>
                    <Text style={[
                      styles.dayNumber,
                      (isToday || isSelected) && styles.dayNumberActive,
                      isToday && !isSelected && { color: ModernColors.primary.main }
                    ]}>{dayNumber}</Text>
                    {hasSession && (
                      <View style={[
                        styles.sessionIndicator,
                        isSelected && { backgroundColor: '#fff' }
                      ]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

         
          {/* Attention Needed Section */}
          {/* Action Required Section */}
          {attentionNeeded.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <AlertCircle size={20} color={ModernColors.error.main} />
                  <Text style={[styles.sectionTitle, { color: ModernColors.error.main }]}>Action Required</Text>
                </View>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
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
                    <ModernCard key={session.id} variant="elevated" padding="md" style={[styles.attentionCard, { borderColor: ModernColors.error.light, borderWidth: 1, width: CARD_WIDTH, flexShrink: 0 }]}>
                      
                      {/* Minimal Header */}
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                             <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: ModernColors.error.main}} />
                             <Text style={{fontSize: 14, fontWeight: '700', color: ModernColors.error.main, letterSpacing: 0.5}}>
                                 CHECK-IN REQUIRED
                             </Text>
                          </View>
                          <Text style={{fontSize: 12, fontWeight: '600', color: ModernColors.text.secondary}}>
                             {sessionDateTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(`2000-01-01 ${session.job_requirement?.start_time || '00:00'}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </Text>
                      </View>

                      {/* Main Info */}
                      <Text style={{fontSize: 18, fontWeight: '700', color: ModernColors.text.primary, marginBottom: 4}}>
                         {session.job_requirement?.hospital?.name || 'Hospital Name'}
                      </Text>
                      <Text style={{fontSize: 14, color: ModernColors.text.secondary, marginBottom: 16}}>
                         {session.job_requirement?.department || 'Department'}
                      </Text>

                      {/* Trust Note */}
                      <View style={{
                          backgroundColor: '#FFF4E5', 
                          padding: 12, 
                          borderRadius: 8, 
                          marginBottom: 16,
                          flexDirection: 'row',
                          gap: 10
                      }}>
                          <Navigation size={18} color="#F59E0B" style={{marginTop: 2}} />
                          <View style={{flex: 1}}>
                              <Text style={{fontSize: 13, fontWeight: '600', color: '#B45309', marginBottom: 2}}>
                                  Live Location Mandatory
                              </Text>
                              <Text style={{fontSize: 12, color: '#92400E', lineHeight: 16}}>
                                  Sharing your live location build trust with the hospital regarding your availability.
                              </Text>
                          </View>
                      </View>
                      
                      {/* Action Button */}
                      <TouchableOpacity
                        style={{
                            backgroundColor: ModernColors.primary.main,
                            paddingVertical: 12,
                            borderRadius: 10,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 8,
                            shadowColor: ModernColors.primary.main,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            elevation: 4
                        }}
                        onPress={() => {
                          if (session.application_id) {
                            router.push(`/job-detail/${session.application_id}`);
                          } else {
                            if (__DEV__) {
                              console.warn("No application ID for session:", session.id);
                            }
                          }
                        }}
                      >
                        <Text style={{color: '#fff', fontSize: 14, fontWeight: '700'}}>
                            Check In & Start Tracking
                        </Text>
                        <ArrowRight size={16} color="#fff" />
                      </TouchableOpacity>

                    </ModernCard>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Active Sessions Section */}
          {activeSessions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <View style={styles.activeIndicator} />
                  <Text style={styles.sectionTitle}>Active Sessions</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
                {activeSessions.map((session: any) => {
                  const application = myApplications.find(
                    (app: any) => app.job_session?.id === session.id
                  );
                  const hospital = session.job_requirement?.hospital || session.jobRequirement?.hospital;
                  const checkInTime = session.check_in_time 
                    ? new Date(session.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : null;
                  const sessionDate = session.session_date 
                    ? new Date(session.session_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : 'Date TBD';
                  const startTime = session.job_requirement?.start_time || session.jobRequirement?.start_time
                    ? new Date(`2000-01-01 ${session.job_requirement?.start_time || session.jobRequirement?.start_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'Time TBD';
                  const location = session.job_requirement?.location_name || session.job_requirement?.address || hospital?.address || 'Location TBD';
                  const paymentAmount = session.payment_amount || session.job_requirement?.payment_amount || 0;
                  const dept = session.job_requirement?.department || session.jobRequirement?.department || 'Department';
                  const statusPill = (() => {
                    if (session.status === 'in_progress') return { text: 'In Progress', color: ModernColors.warning.main };
                    if (checkInTime) return { text: 'Checked In', color: ModernColors.success.main };
                    return { text: 'Scheduled', color: ModernColors.primary.main };
                  })();

                  return (
                    <ModernCard key={session.id} variant="elevated" padding="md" style={[styles.activeSessionCard, { width: CARD_WIDTH, flexShrink: 0 }]}>
                      {/* Header (Hospital-style) */}
                      <View style={styles.activeSessionTopRow}>
                        <View style={styles.activeSessionTopLeft}>
                          <View style={styles.activeSessionDeptBadge}>
                            <Building2 size={14} color={ModernColors.primary.main} />
                            <Text style={styles.activeSessionDeptText} numberOfLines={1}>{dept}</Text>
                          </View>
                          <View style={[styles.activeSessionStatusBadge, { borderColor: statusPill.color, backgroundColor: `${statusPill.color}14` }]}>
                            <View style={[styles.activeSessionStatusDot, { backgroundColor: statusPill.color }]} />
                            <Text style={[styles.activeSessionStatusText, { color: statusPill.color }]}>{statusPill.text}</Text>
                          </View>
                        </View>

                        {!!paymentAmount && (
                          <View style={styles.activeSessionPayBadge}>
                            <Text style={styles.activeSessionPayText}>₹{Number(paymentAmount).toLocaleString('en-IN')}</Text>
                          </View>
                        )}
                      </View>

                      {/* Main title */}
                      <Text style={styles.activeSessionHospitalName} numberOfLines={1}>
                        {hospital?.name || 'Hospital'}
                      </Text>

                      <View style={styles.activeSessionDetails}>
                        <View style={styles.activeSessionDetailRow}>
                          <MapPin size={14} color={ModernColors.text.secondary} />
                          <Text style={styles.activeSessionDetailText} numberOfLines={1}>{location}</Text>
                        </View>
                        <View style={styles.activeSessionDetailRow}>
                          <Calendar size={14} color={ModernColors.text.secondary} />
                          <Text style={styles.activeSessionDetailText}>{sessionDate}</Text>
                        </View>
                        <View style={styles.activeSessionDetailRow}>
                          <Clock size={14} color={ModernColors.text.secondary} />
                          <Text style={styles.activeSessionDetailText}>
                            {startTime}
                            {checkInTime && ` • Check-in: ${checkInTime}`}
                          </Text>
                        </View>
                      </View>

                      {/* Process Steps */}
                      <View style={styles.processStepsContainer}>
                        <View style={[styles.processStep, checkInTime && styles.processStepCompleted]}>
                          <View style={[styles.processStepDot, checkInTime && { backgroundColor: ModernColors.success.main }]} />
                          <Text style={[styles.processStepText, checkInTime && { color: ModernColors.success.main }]}>
                            Check-in {checkInTime ? `✓ ${checkInTime}` : 'Pending'}
                          </Text>
                        </View>
                        <View style={[styles.processStep, session.status === 'in_progress' && styles.processStepCompleted]}>
                          <View style={[styles.processStepDot, session.status === 'in_progress' && { backgroundColor: ModernColors.success.main }]} />
                          <Text style={[styles.processStepText, session.status === 'in_progress' && { color: ModernColors.success.main }]}>
                            Session Active {session.status === 'in_progress' ? '✓' : 'Pending'}
                          </Text>
                        </View>
                        <View style={[styles.processStep, session.attendance?.check_out_time && styles.processStepCompleted]}>
                          <View style={[styles.processStepDot, session.attendance?.check_out_time && { backgroundColor: ModernColors.success.main }]} />
                          <Text style={[styles.processStepText, session.attendance?.check_out_time && { color: ModernColors.success.main }]}>
                            Check-out {session.attendance?.check_out_time ? '✓' : 'Pending'}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.activeSessionViewButton}
                        onPress={() => {
                          if (application) {
                            router.push(`/(tabs)/job-detail/${application.id}`);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.activeSessionViewButtonText}>View Details</Text>
                        <ArrowRight size={16} color={ModernColors.primary.main} />
                      </TouchableOpacity>
                    </ModernCard>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Past Sessions (Completed/Cancelled/Scheduled but not active) */}
          {jobSessions.filter(s => !activeSessions.some(active => active.id === s.id)).length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Clock size={20} color={ModernColors.primary.main} />
                  <Text style={styles.sectionTitle}>Shift History</Text>
                </View>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
                {jobSessions
                  .filter(s => !activeSessions.some(active => active.id === s.id))
                  .slice(0, 5) // Limit to 5 recent
                  .map(session => {
                    const application = myApplications.find(app => app.job_session?.id === session.id);
                    return (
                        <View key={session.id} style={{ width: CARD_WIDTH, flexShrink: 0 }}>
                          <MinimalSessionCard 
                            session={session} 
                            onPress={() => {
                                if (application) {
                                    router.push(`/(tabs)/job-detail/${application.id}`);
                                } else {
                                    // Fallback if application logic fails
                                    // router.push(`/session/${session.id}`);
                                }
                            }}
                          />
                        </View>
                    );
                  })
                }
              </ScrollView>
            </View>
          )}

          {/* New Opportunities Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <TrendingUp size={20} color={ModernColors.primary.main} />
                <Text style={styles.sectionTitle}>New Opportunities</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/all-openings')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {loadingRequirements ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading opportunities...</Text>
              </View>
            ) : jobRequirements.filter((req: any) => {
              const isExpired = req.is_expired || false;
              const hasApplied = myApplications.some((app: any) => app.job_requirement_id === req.id);
              // Show all non-expired jobs (including filled ones) that haven't been applied to
              return !isExpired && !hasApplied;
            }).length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyJobsState}>
                  <TrendingUp size={48} color={ModernColors.primary.light} style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyStateTitle}>No New Opportunities</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {!doctor?.departments || doctor.departments.length === 0 
                      ? 'Add your departments in your profile to see relevant job opportunities.' 
                      : 'Check back soon for new job postings matching your departments.'}
                  </Text>
                  {(!doctor?.departments || doctor.departments.length === 0) && (
                    <TouchableOpacity
                      style={styles.updateProfileButton}
                      onPress={() => router.push('/profile')}
                    >
                      <Text style={styles.updateProfileButtonText}>Update Profile</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : isTablet ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.openingsScroll} contentContainerStyle={styles.openingsScrollContent}>
                {jobRequirements
                  .filter((req: any) => {
                    const isExpired = req.is_expired || false;
                    const hasApplied = myApplications.some((app: any) => app.job_requirement_id === req.id);
                    // Show all non-expired jobs (including filled ones) that haven't been applied to
                    return !isExpired && !hasApplied;
                  })
                  .slice(0, 4)
                  .map((requirement) => {
                    const application = myApplications.find(
                      (app: any) => app.job_requirement_id === requirement.id
                    );
                    const hasApplied = !!application;
                    const applicationStatus = application?.status || null;
                    const isJobCompleted = application?.job_session?.status === 'completed';
                    const isExpired = requirement.is_expired || false;
                    const session = application?.job_session;
                    
                    const hospitalPicture = requirement.hospital?.hospital_picture_url || null;
                    const hospitalRating = requirement.hospital?.average_rating || 0;
                    const matchPercentage = requirement.match_percentage || 0;
                    const paymentAmount = requirement.payment_amount || 0;
                    
                    // Posted time
                    const postedDate = requirement.created_at ? new Date(requirement.created_at) : null;
                    const isPostedToday = postedDate ? 
                      postedDate.toDateString() === new Date().toDateString() : false;
                    const postedTime = postedDate ? 
                      postedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
                    const postedDateStr = postedDate ? 
                      postedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: postedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }) : null;
                    
                    const workDate = requirement.work_required_date 
                      ? new Date(requirement.work_required_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Date TBD';
                    const startTime = requirement.start_time 
                      ? new Date(`2000-01-01 ${requirement.start_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : 'Time TBD';
                    const endTime = requirement.end_time 
                      ? new Date(`2000-01-01 ${requirement.end_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : null;
                    const location = requirement.location_name || requirement.address || requirement.hospital?.address || 'Location TBD';
                    
                    return (
                      <ModernCard key={requirement.id} variant="elevated" padding="sm" style={[styles.newOpportunityCard, { width: CARD_WIDTH, flexShrink: 0 }]}>
                        {/* Hospital Image Background - Right Side */}
                        {hospitalPicture && (
                          <View style={styles.newOpportunityImageBackground}>
                            <Image
                              source={{ uri: getFullImageUrl(hospitalPicture) }}
                              style={styles.newOpportunityBackgroundImage}
                              resizeMode="cover"
                            />
                            <View style={styles.newOpportunityImageOverlay} />
                          </View>
                        )}
                        
                        {/* Content Container */}
                        <View style={hospitalPicture ? styles.newOpportunityContentWrapper : styles.newOpportunityContentWrapperFull}>
                          {/* Header with Logo */}
                          <View style={styles.newOpportunityCardHeader}>
                            <View style={styles.newOpportunityHeaderLeft}>
                              {requirement.hospital?.logo_url ? (
                                <View style={styles.newOpportunityIconBox}>
                                  <Image 
                                    source={{ uri: getFullImageUrl(requirement.hospital.logo_url) }} 
                                    style={styles.newOpportunityLogo}
                                    resizeMode="cover"
                                  />
                                </View>
                              ) : (
                                <View style={[styles.newOpportunityIconBox, { backgroundColor: ModernColors.primary.light }]}>
                                  <Building2 size={18} color={ModernColors.primary.main} />
                                </View>
                              )}
                              <View style={styles.newOpportunityHeaderText}>
                                <Text style={styles.newOpportunityHospitalName} numberOfLines={1}>
                                  {requirement.hospital?.name || 'Hospital'}
                                </Text>
                                <Text style={styles.newOpportunityDepartment} numberOfLines={1}>
                                  {requirement.department || 'General Practice'}
                                </Text>
                              </View>
                            </View>
                          </View>
                          
                          {/* Urgent Badge - Top right corner over image */}
                          {isPostedToday && (
                            <View style={styles.urgentBadgeOverlay}>
                              <AlertCircle size={12} color="#EF4444" />
                              <Text style={styles.urgentBadgeText}>Urgent</Text>
                            </View>
                          )}
                          
                          {/* Details - Compact like application card */}
                          <View style={styles.newOpportunityDetailsContainer}>
                            <View style={styles.newOpportunityDetailRow}>
                              <Calendar size={12} color={ModernColors.text.secondary} />
                              <Text style={styles.newOpportunityDetailText} numberOfLines={1}>{workDate}</Text>
                            </View>
                            <View style={styles.newOpportunityDetailRow}>
                              <Clock size={12} color={ModernColors.text.secondary} />
                              <Text style={styles.newOpportunityDetailText} numberOfLines={1}>
                                {startTime}{endTime ? ` - ${endTime}` : ''}
                              </Text>
                            </View>
                            <View style={styles.newOpportunityDetailRow}>
                              <MapPin size={12} color={ModernColors.text.secondary} />
                              <Text style={styles.newOpportunityDetailText} numberOfLines={1}>{location}</Text>
                            </View>
                            <View style={styles.newOpportunityDetailRow}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: ModernColors.primary.main }}>₹</Text>
                              <Text style={[styles.newOpportunityDetailText, { color: ModernColors.primary.main, fontWeight: '600' }]} numberOfLines={1}>
                                {paymentAmount}
                              </Text>
                            </View>
                          </View>
                          
                          {/* Apply Button - Similar style to application card */}
                          {!hasApplied && !isExpired && (
                            requirement.is_filled ? (
                              <View style={[styles.newOpportunityApplyButton, { backgroundColor: ModernColors.neutral.gray200, opacity: 0.7 }]}>
                                <Text style={[styles.newOpportunityApplyButtonText, { color: ModernColors.text.secondary }]}>Position Filled</Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.newOpportunityApplyButton}
                                onPress={() => handleApply(requirement.id)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.newOpportunityApplyButtonText}>Apply Now</Text>
                                <ArrowRight size={16} color="#fff" />
                              </TouchableOpacity>
                            )
                          )}
                        </View>
                      </ModernCard>
                    );
                  })}
              </ScrollView>
            ) : (
              <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.openingsScroll}
                  contentContainerStyle={styles.openingsScrollContent}
                >
                {jobRequirements
                  .filter((req: any) => {
                    // Filter out expired jobs from "New Opportunities"
                    // Include filled jobs so users can see they're filled
                    const isExpired = req.is_expired || false;
                    const hasApplied = myApplications.some((app: any) => app.job_requirement_id === req.id);
                    // Show all non-expired jobs (including filled ones) that haven't been applied to
                    return !isExpired && !hasApplied;
                  })
                  .slice(0, 5)
                  .map((requirement) => {
                  const application = myApplications.find(
                    (app: any) => app.job_requirement_id === requirement.id
                  );
                  const hasApplied = !!application;
                  const applicationStatus = application?.status || null;
                  const isJobCompleted = application?.job_session?.status === 'completed';
                  const isExpired = requirement.is_expired || false;
                  const session = application?.job_session;
                  
                  const hospitalPicture = requirement.hospital?.hospital_picture_url || null; // Only use hospital_picture, not logo
                  const hospitalRating = requirement.hospital?.average_rating || 0;
                  const totalRatings = requirement.hospital?.total_ratings || 0;
                  const matchPercentage = requirement.match_percentage || 0;
                  const hourlyRate = requirement.payment_amount || requirement.salary_range_max || 0;
                  const estimatedTotal = hourlyRate * (requirement.duration_hours || 8) * (requirement.required_sessions || 1);
                  
                  // Format date and time
                  const workDate = requirement.work_required_date 
                    ? new Date(requirement.work_required_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Date TBD';
                  const startTime = requirement.start_time 
                    ? new Date(`2000-01-01 ${requirement.start_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'Time TBD';
                  const endTime = requirement.end_time 
                    ? new Date(`2000-01-01 ${requirement.end_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : null;
                  const location = requirement.location_name || requirement.address || requirement.hospital?.address || 'Location TBD';
                  
                  // Check-in time for active sessions
                  const checkInTime = session?.check_in_time 
                    ? new Date(session.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : null;
                  
                  // Posted time
                  const postedDate = requirement.created_at ? new Date(requirement.created_at) : null;
                  const isPostedToday = postedDate ? 
                    postedDate.toDateString() === new Date().toDateString() : false;
                  const postedTime = postedDate ? 
                    postedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
                  const postedDateStr = postedDate ? 
                    postedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: postedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }) : null;
                  const paymentAmount = requirement.payment_amount || 0;
                  
                  return (
                    <ModernCard key={requirement.id} variant="elevated" padding="sm" style={[styles.newOpportunityCard, { width: CARD_WIDTH, flexShrink: 0 }]}>
                      {/* Hospital Image Background - Right Side */}
                      {hospitalPicture && (
                        <View style={styles.newOpportunityImageBackground}>
                          <Image
                            source={{ uri: getFullImageUrl(hospitalPicture) }}
                            style={styles.newOpportunityBackgroundImage}
                            resizeMode="cover"
                          />
                          <View style={styles.newOpportunityImageOverlay} />
                        </View>
                      )}
                      
                      {/* Content Container */}
                      <View style={hospitalPicture ? styles.newOpportunityContentWrapper : styles.newOpportunityContentWrapperFull}>
                        {/* Urgent Badge - Top right corner over image */}
                        {isPostedToday && (
                          <View style={styles.urgentBadgeOverlay}>
                            <AlertCircle size={12} color="#EF4444" />
                            <Text style={styles.urgentBadgeText}>Urgent</Text>
                          </View>
                        )}

                        {/* Header with Logo */}
                        <View style={styles.newOpportunityCardHeader}>
                          <View style={styles.newOpportunityHeaderLeft}>
                            {requirement.hospital?.logo_url ? (
                              <View style={styles.newOpportunityIconBox}>
                                <Image 
                                  source={{ uri: getFullImageUrl(requirement.hospital.logo_url) }} 
                                  style={styles.newOpportunityLogo}
                                  resizeMode="cover"
                                />
                              </View>
                            ) : (
                              <View style={[styles.newOpportunityIconBox, { backgroundColor: ModernColors.primary.light }]}>
                                <Building2 size={18} color={ModernColors.primary.main} />
                              </View>
                            )}
                            <View style={styles.newOpportunityHeaderText}>
                              <Text style={styles.newOpportunityHospitalName} numberOfLines={1}>
                                {requirement.hospital?.name || 'Hospital'}
                              </Text>
                              <Text style={styles.newOpportunityDepartment} numberOfLines={1}>
                                {requirement.department || 'General Practice'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        {/* Details - Compact like application card */}
                        <View style={styles.newOpportunityDetailsContainer}>
                          <View style={styles.newOpportunityDetailRow}>
                            <Calendar size={12} color={ModernColors.text.secondary} />
                            <Text style={styles.newOpportunityDetailText} numberOfLines={1}>{workDate}</Text>
                          </View>
                          <View style={styles.newOpportunityDetailRow}>
                            <Clock size={12} color={ModernColors.text.secondary} />
                            <Text style={styles.newOpportunityDetailText} numberOfLines={1}>
                              {startTime}{endTime ? ` - ${endTime}` : ''}
                            </Text>
                          </View>
                          <View style={styles.newOpportunityDetailRow}>
                            <MapPin size={12} color={ModernColors.text.secondary} />
                            <Text style={styles.newOpportunityDetailText} numberOfLines={1}>{location}</Text>
                          </View>
                          <View style={styles.newOpportunityDetailRow}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: ModernColors.primary.main }}>₹</Text>
                            <Text style={[styles.newOpportunityDetailText, { color: ModernColors.primary.main, fontWeight: '600' }]} numberOfLines={1}>
                              {paymentAmount}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Apply Button - Similar style to application card */}
                        {!hasApplied && !isExpired && (
                          requirement.is_filled ? (
                            <View style={[styles.newOpportunityApplyButton, { backgroundColor: ModernColors.neutral.gray200, opacity: 0.7 }]}>
                              <Text style={[styles.newOpportunityApplyButtonText, { color: ModernColors.text.secondary }]}>Position Filled</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.newOpportunityApplyButton}
                              onPress={() => handleApply(requirement.id)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.newOpportunityApplyButtonText}>Apply Now</Text>
                              <ArrowRight size={16} color="#fff" />
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    </ModernCard>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* My Applications Section - Shows all applied jobs with status */}
          {myApplications.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <CheckCircle size={20} color={ModernColors.primary.main} />
                  <Text style={styles.sectionTitle}>My Applications</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/approved-applications')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.applicationsScroll}
                contentContainerStyle={styles.applicationsScrollContent}
              >
                {myApplications
                  .filter((app: any) => {
                    // Show all applications except cancelled ones
                    // Include completed ones so users can see their job history
                    const sessionStatus = app.job_session?.status;
                    return sessionStatus !== 'cancelled';
                  })
                  .sort((a: any, b: any) => {
                    // Sort by: in_progress first, then scheduled, then pending, then completed
                    const statusOrder: any = { 'in_progress': 1, 'scheduled': 2, 'pending': 3, 'completed': 4, 'rejected': 5 };
                    const aStatus = a.job_session?.status || (a.status === 'selected' ? 'scheduled' : a.status);
                    const bStatus = b.job_session?.status || (b.status === 'selected' ? 'scheduled' : b.status);
                    return (statusOrder[aStatus] || 99) - (statusOrder[bStatus] || 99);
                  })
                  .slice(0, 5)
                  .map((application: any) => {
                    const requirement = application.job_requirement;
                    if (!requirement) return null;

                    const applicationStatus = application.status || 'pending';
                    const session = application.job_session;
                    const sessionStatus = session?.status || null;
                    
                    const hospitalPicture = requirement.hospital?.hospital_picture_url || null;
                    const hospitalRating = requirement.hospital?.average_rating || 0;
                    
                    const workDate = requirement.work_required_date 
                      ? new Date(requirement.work_required_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Date TBD';
                    const startTime = requirement.start_time 
                      ? new Date(`2000-01-01 ${requirement.start_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : 'Time TBD';
                    const endTime = requirement.end_time 
                      ? new Date(`2000-01-01 ${requirement.end_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : null;
                    const location = requirement.location_name || requirement.address || requirement.hospital?.address || 'Location TBD';
                    
                    const checkInTime = session?.check_in_time 
                      ? new Date(session.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : null;
                    const checkOutTime = session?.attendance?.check_out_time 
                      ? new Date(session.attendance.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : null;

                    // Determine current status stage
                    let currentStage = 'applied';
                    let statusMessage = 'Applied';
                    let statusColor = '#3B82F6';
                    
                    if (applicationStatus === 'rejected') {
                      currentStage = 'rejected';
                      statusMessage = 'Rejected';
                      statusColor = '#EF4444';
                    } else if (applicationStatus === 'selected' && !session) {
                      currentStage = 'accepted';
                      statusMessage = 'Accepted - Check-in Required';
                      statusColor = '#10B981';
                    } else if (session && sessionStatus === 'scheduled') {
                      currentStage = 'scheduled';
                      statusMessage = 'Scheduled - Check-in Required';
                      statusColor = '#10B981';
                    } else if (session && sessionStatus === 'in_progress') {
                      currentStage = 'in_progress';
                      statusMessage = 'In Progress';
                      statusColor = '#10B981';
                    } else if (session && sessionStatus === 'completed') {
                      currentStage = 'completed';
                      statusMessage = 'Completed';
                      statusColor = '#10B981';
                    } else if (applicationStatus === 'pending') {
                      currentStage = 'pending';
                      statusMessage = 'Waiting for Approval';
                      statusColor = '#F59E0B';
                    }

                    const isExpanded = expandedApplicationId === application.id;
                    
                    return (
                      <TouchableOpacity
                        key={application.id}
                        activeOpacity={0.9}
                        onPress={() => setExpandedApplicationId(isExpanded ? null : application.id)}
                      >
                        <ModernCard variant="elevated" padding="md" style={styles.applicationCard}>
                        {/* Hospital Image - Right side, hidden when expanded */}
                        {hospitalPicture && !isExpanded && (
                          <View style={styles.applicationImageBackground}>
                            <Image
                              source={{ uri: getFullImageUrl(hospitalPicture) }}
                              style={styles.applicationBackgroundImage}
                              resizeMode="cover"
                            />
                            <View style={styles.applicationImageOverlay} />
                          </View>
                        )}
                        
                        {/* Content Container - Full width when expanded */}
                        <View style={isExpanded ? styles.applicationContentWrapperFull : (hospitalPicture ? styles.applicationContentWrapper : styles.applicationContentWrapperFull)}>
                          {/* Header with Hospital Name */}
                          <View style={styles.applicationCardHeader}>
                            <View style={styles.applicationHeaderLeft}>
                              {requirement.hospital?.logo_url ? (
                                <View style={styles.applicationIconBox}>
                                  <Image 
                                    source={{ uri: getFullImageUrl(requirement.hospital.logo_url) }} 
                                    style={styles.applicationLogo}
                                    resizeMode="cover"
                                  />
                                </View>
                              ) : (
                                <View style={[styles.applicationIconBox, { backgroundColor: ModernColors.primary.light }]}>
                                  <Building2 size={18} color={ModernColors.primary.main} />
                                </View>
                              )}
                              <View style={styles.applicationHeaderText}>
                                <Text style={styles.applicationHospitalName} numberOfLines={1}>
                                  {requirement.hospital?.name || 'Hospital'}
                                </Text>
                                <Text style={styles.applicationDepartment} numberOfLines={1}>
                                  {requirement.department || 'General Practice'}
                                </Text>
                              </View>
                            </View>
                          </View>
                          
                          {/* Status Badge - Below Header */}
                          <View style={styles.applicationStatusBadgeContainer}>
                            <View style={[styles.applicationMainStatusBadge, { 
                              backgroundColor: statusColor + '15',
                              borderColor: statusColor,
                            }]}>
                              <View style={[styles.statusBadgeDot, { backgroundColor: statusColor }]} />
                              <Text style={[styles.applicationMainStatusText, { color: statusColor }]} numberOfLines={1}>
                                {statusMessage}
                              </Text>
                            </View>
                          </View>
                        
                        {/* Application Details - Compact */}
                        <View style={styles.applicationDetailsContainer}>
                          <View style={styles.applicationDetailRow}>
                            <Calendar size={12} color={ModernColors.text.secondary} />
                            <Text style={styles.applicationDetailText} numberOfLines={1}>{workDate}</Text>
                          </View>
                          
                          {isExpanded && (
                            <>
                              <View style={styles.applicationDetailRow}>
                                <MapPin size={12} color={ModernColors.text.secondary} />
                                <Text style={styles.applicationDetailText} numberOfLines={2}>{location}</Text>
                              </View>
                              
                              <View style={styles.applicationDetailRow}>
                                <Clock size={12} color={ModernColors.text.secondary} />
                                <Text style={styles.applicationDetailText} numberOfLines={1}>
                                  {startTime}{endTime ? ` - ${endTime}` : ''}
                                </Text>
                              </View>
                            </>
                          )}
                        </View>

                        {/* Status Stages - Only show when expanded */}
                        {isExpanded && (
                          <View style={styles.applicationStatusStages}>
                          {/* Applied Stage - Always completed */}
                          <View style={styles.statusStage}>
                            <View style={[styles.statusStageIcon, { backgroundColor: '#3B82F6' }]}>
                              <Check size={10} color="#FFFFFF" />
                            </View>
                            <Text style={[styles.statusStageText, { color: '#3B82F6', fontWeight: '700' }]}>Applied</Text>
                          </View>
                          
                          <View style={styles.statusStageLine} />
                          
                          {/* Waiting/Rejected Stage */}
                          <View style={styles.statusStage}>
                            {currentStage === 'pending' || currentStage === 'rejected' ? (
                              <View style={[
                                styles.statusStageIcon,
                                { backgroundColor: currentStage === 'rejected' ? '#EF4444' : '#F59E0B' }
                              ]}>
                                {currentStage === 'rejected' ? (
                                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>✕</Text>
                                ) : (
                                  <View style={styles.statusStagePulse} />
                                )}
                              </View>
                            ) : (
                              <View style={[styles.statusStageIcon, { backgroundColor: ModernColors.neutral.gray300 }]}>
                                <Check size={10} color="#FFFFFF" />
                              </View>
                            )}
                            <Text style={[
                              styles.statusStageText,
                              currentStage === 'pending' && { color: '#F59E0B', fontWeight: '700' },
                              currentStage === 'rejected' && { color: '#EF4444', fontWeight: '700' },
                              (currentStage !== 'pending' && currentStage !== 'rejected') && { color: ModernColors.success.main, fontWeight: '700' }
                            ]} numberOfLines={1}>
                              {applicationStatus === 'rejected' ? 'Rejected' : 'Waiting'}
                            </Text>
                          </View>
                          
                          {applicationStatus !== 'rejected' && (
                            <>
                              <View style={styles.statusStageLine} />
                              
                              {/* Check-in Stage */}
                              <View style={styles.statusStage}>
                                {checkInTime ? (
                                  <View style={[styles.statusStageIcon, { backgroundColor: ModernColors.success.main }]}>
                                    <Check size={10} color="#FFFFFF" />
                                  </View>
                                ) : (
                                  <View style={[styles.statusStageIcon, { backgroundColor: ModernColors.neutral.gray300 }]}>
                                    <View style={styles.statusStagePulse} />
                                  </View>
                                )}
                                <Text style={[
                                  styles.statusStageText,
                                  checkInTime && { color: ModernColors.success.main, fontWeight: '700' }
                                ]} numberOfLines={1}>
                                  {checkInTime ? 'Checked In' : 'Check-in'}
                                </Text>
                              </View>
                              
                              {(sessionStatus === 'in_progress' || sessionStatus === 'completed') && (
                                <>
                                  <View style={styles.statusStageLine} />
                                  <View style={styles.statusStage}>
                                    <View style={[styles.statusStageIcon, { backgroundColor: ModernColors.success.main }]}>
                                      <Check size={10} color="#FFFFFF" />
                                    </View>
                                    <Text style={[styles.statusStageText, { color: ModernColors.success.main, fontWeight: '700' }]} numberOfLines={1}>
                                      {sessionStatus === 'completed' ? 'Completed' : 'In Progress'}
                                    </Text>
                                  </View>
                                </>
                              )}
                            </>
                          )}
                        </View>
                        )}
                        
                        {/* Expand/Collapse Indicator */}
                        <View style={styles.applicationExpandIndicator}>
                          <Text style={styles.applicationExpandText}>
                            {isExpanded ? 'Tap to collapse' : 'Tap for details'}
                          </Text>
                          <ArrowRight 
                            size={14} 
                            color={ModernColors.primary.main} 
                            style={[styles.expandIcon, isExpanded && styles.expandIconRotated]}
                          />
                        </View>
                        </View>
                      </ModernCard>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          )}

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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
                {upcomingApplications
                  .sort((a: any, b: any) => {
                    // Sort by date in ascending order (nearest date first)
                    let aDate: Date | null = null;
                    let bDate: Date | null = null;
                    
                    if (a.job_requirement?.work_required_date) {
                      aDate = new Date(a.job_requirement.work_required_date);
                    } else if (a.job_session?.session_date) {
                      aDate = new Date(a.job_session.session_date);
                    } else if (a.available_date) {
                      aDate = new Date(a.available_date);
                    }
                    
                    if (b.job_requirement?.work_required_date) {
                      bDate = new Date(b.job_requirement.work_required_date);
                    } else if (b.job_session?.session_date) {
                      bDate = new Date(b.job_session.session_date);
                    } else if (b.available_date) {
                      bDate = new Date(b.available_date);
                    }
                    
                    if (!aDate && !bDate) return 0;
                    if (!aDate) return 1;
                    if (!bDate) return -1;
                    
                    return aDate.getTime() - bDate.getTime();
                  })
                  .slice(0, 3)
                  .map((app: any) => {
                  const taskDate = app.job_requirement?.work_required_date 
                    ? new Date(app.job_requirement.work_required_date)
                    : app.job_session?.session_date 
                    ? new Date(app.job_session.session_date)
                    : null;
                  
                  const requirement = app.job_requirement;
                  const hospital = requirement?.hospital;
                  const hospitalPicture = hospital?.hospital_picture_url || null;
                  const session = app.job_session;
                  const applicationStatus = app.status || 'pending';
                  
                  // Determine status
                  let statusColor = '#3B82F6';
                  let statusMessage = 'Upcoming';
                  if (applicationStatus === 'selected' && session) {
                    statusColor = '#10B981';
                    statusMessage = 'Scheduled';
                  } else if (applicationStatus === 'selected') {
                    statusColor = '#10B981';
                    statusMessage = 'Approved';
                  } else if (applicationStatus === 'pending') {
                    statusColor = '#F59E0B';
                    statusMessage = 'Pending';
                  }
                  
                  const workDate = requirement?.work_required_date 
                    ? new Date(requirement.work_required_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : taskDate 
                    ? taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Date TBD';
                  const startTime = requirement?.start_time 
                    ? new Date(`2000-01-01 ${requirement.start_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'Time TBD';
                  const location = requirement?.location_name || requirement?.address || hospital?.address || 'Location TBD';
                  
                  return (
                    <ModernCard key={app.id} variant="elevated" padding="md" style={[styles.taskCard, { width: CARD_WIDTH, flexShrink: 0 }]}>
                      {/* Hospital Image Background - Full Right Side */}
                      {hospitalPicture && (
                        <View style={styles.taskImageBackground}>
                          <Image
                            source={{ uri: getFullImageUrl(hospitalPicture) }}
                            style={styles.taskBackgroundImage}
                            resizeMode="cover"
                          />
                          <View style={styles.taskImageOverlay} />
                        </View>
                      )}
                      
                      {/* Content Container - Left Side */}
                      <View style={styles.taskContentWrapper}>
                        {/* Header with Hospital Name and Status */}
                        <View style={styles.taskHeader}>
                          <View style={styles.taskHeaderLeft}>
                            {hospital?.logo_url ? (
                              <View style={styles.taskIconContainer}>
                                <Image 
                                  source={{ uri: getFullImageUrl(hospital.logo_url) }} 
                                  style={styles.taskLogo}
                                  resizeMode="cover"
                                />
                              </View>
                            ) : (
                              <View style={[styles.taskIconContainer, { backgroundColor: ModernColors.primary.light }]}>
                                <Building2 size={18} color={ModernColors.primary.main} />
                              </View>
                            )}
                            <View style={styles.taskInfo}>
                              <Text style={styles.taskHospital} numberOfLines={1}>
                                {hospital?.name || 'Hospital'}
                              </Text>
                              <Text style={styles.taskDepartment} numberOfLines={1}>
                                {requirement?.department || 'Department'}
                              </Text>
                            </View>
                          </View>
                          {/* Status Badge */}
                          <View style={[styles.taskStatusBadge, { 
                            backgroundColor: statusColor + '15',
                            borderColor: statusColor,
                          }]}>
                            <View style={[styles.taskStatusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.taskStatusText, { color: statusColor }]}>
                              {statusMessage}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Task Details */}
                        <View style={styles.taskDetailsContainer}>
                          <View style={styles.taskDetailRow}>
                            <MapPin size={12} color={ModernColors.text.secondary} />
                            <Text style={styles.taskDetailText} numberOfLines={1}>{location}</Text>
                          </View>
                          
                          <View style={styles.taskDetailRow}>
                            <Calendar size={12} color={ModernColors.text.secondary} />
                            <Text style={styles.taskDetailText}>{workDate}</Text>
                          </View>
                          
                          <View style={styles.taskDetailRow}>
                            <Clock size={12} color={ModernColors.text.secondary} />
                            <Text style={styles.taskDetailText}>{startTime}</Text>
                          </View>
                        </View>
                        
                        {/* View Details Button */}
                        <TouchableOpacity
                          style={styles.taskButton}
                          onPress={() => router.push(`/job-detail/${app.id}`)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.taskButtonText}>View Details</Text>
                          <ArrowRight size={14} color={ModernColors.primary.main} />
                        </TouchableOpacity>
                      </View>
                    </ModernCard>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Promo Carousel */}
          <PromoCarousel 
            onPromoPress={(promo) => {
              router.push({
                pathname: '/blog-detail',
                params: { blogId: promo.id }
              });
            }}
          />
        </ScrollView>
        
        {/* Schedule Modal */}
        <Modal
            animationType="fade"
            transparent={true}
            visible={scheduleModalVisible}
            onRequestClose={() => setScheduleModalVisible(false)}
        >
            <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20
            }}>
                <View style={{
                    backgroundColor: '#fff',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 340,
                    padding: 20,
                    ...Shadows.lg
                }}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                        <View>
                            <Text style={{fontSize: 20, fontWeight: '700', color: ModernColors.text.primary}}>
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                            </Text>
                            <Text style={{fontSize: 14, color: ModernColors.text.secondary}}>
                                {selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setScheduleModalVisible(false)} style={{padding: 4}}>
                            <View style={{backgroundColor: ModernColors.neutral.gray200, borderRadius: 12, padding: 6}}>
                                <ArrowRight size={16} color={ModernColors.text.primary} style={{transform: [{rotate: '45deg'}]}} /> 
                                {/* Using Arrow as Close 'X' approximation or should create X component. 
                                    Actually simplest is allow clicking outside, but close button is good.
                                    Let's use a clear Close functionality.
                                 */}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {(() => {
                        const dateSessions = jobSessions.filter((session: any) => {
                            if (!session.session_date) return false;
                            return new Date(session.session_date).toDateString() === selectedDate.toDateString();
                        });

                        if (dateSessions.length === 0) {
                            return (
                                <View style={{paddingVertical: 30, alignItems: 'center'}}>
                                    <Clock size={40} color={ModernColors.neutral.gray300} style={{marginBottom: 12}} />
                                    <Text style={{fontSize: 16, color: ModernColors.text.secondary, fontWeight: '500'}}>No shifts scheduled</Text>
                                    <Text style={{fontSize: 12, color: ModernColors.text.tertiary, textAlign: 'center', marginTop: 4}}>
                                        You don't have any work scheduled for this day.
                                    </Text>
                                </View>
                            );
                        }

                        return (
                            <View style={{gap: 12}}>
                                {dateSessions.map((session: any, idx) => {
                                    // Late is shown ONLY after scheduled check-in time has passed (session_date + start_time),
                                    // and only if check-in hasn't happened yet.
                                    const now = new Date();
                                    const scheduled = (() => {
                                        if (!session?.session_date) return null;
                                        const dt = new Date(session.session_date);
                                        const startTime = session?.job_requirement?.start_time;
                                        if (startTime) {
                                            const [hh, mm] = String(startTime).split(':');
                                            const hours = parseInt(hh, 10);
                                            const minutes = parseInt(mm, 10);
                                            if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
                                                dt.setHours(hours, minutes, 0, 0);
                                            }
                                        }
                                        return dt;
                                    })();
                                    const isLate = !!(scheduled && now > scheduled && !session.check_in_time);
                                    const lateMinutes = isLate && scheduled
                                        ? Math.max(0, Math.floor((now.getTime() - scheduled.getTime()) / (1000 * 60)))
                                        : 0;
                                    
                                    return (
                                        <TouchableOpacity 
                                            key={idx}
                                            style={{
                                                padding: 12,
                                                backgroundColor: ModernColors.background.secondary,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: ModernColors.border.light
                                            }}
                                            onPress={() => {
                                                setScheduleModalVisible(false);
                                                // Use application_id if available, otherwise find it from myApplications
                                                if (session.application_id) {
                                                    router.push(`/job-detail/${session.application_id}`);
                                                } else {
                                                    // Find application by job_requirement_id
                                                    const application = myApplications.find(
                                                        (app: any) => app.job_requirement_id === session.job_requirement_id
                                                    );
                                                    if (application) {
                                                        router.push(`/job-detail/${application.id}`);
                                                    } else {
                                                        Alert.alert('Error', 'Application not found for this session');
                                                    }
                                                }
                                            }}
                                        >
                                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4}}>
                                                <Text style={{fontSize: 16, fontWeight: '700', color: ModernColors.text.primary, flex: 1}}>
                                                    {session.job_requirement?.hospital?.name || 'Hospital'}
                                                </Text>
                                                {isLate && (
                                                    <View style={styles.lateBadge}>
                                                        <Text style={styles.lateBadgeText}>
                                                            Late {lateMinutes}m
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={{fontSize: 12, color: '#FFFFFF', fontWeight: '600', marginBottom: 4, backgroundColor: ModernColors.primary.main, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start'}}>
                                                Job Session
                                            </Text>
                                            <Text style={{fontSize: 13, color: ModernColors.text.secondary, marginBottom: 8}}>
                                                {session.job_requirement?.department || 'Department'}
                                            </Text>
                                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                                <Clock size={12} color={ModernColors.primary.main} />
                                                <Text style={{fontSize: 12, fontWeight: '600', color: ModernColors.primary.main}}>
                                                    {new Date(`2000-01-01 ${session.job_requirement?.start_time || '00:00'}`).toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12: true})}
                                                     {' - '}
                                                    {new Date(`2000-01-01 ${session.job_requirement?.end_time || '00:00'}`).toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12: true})}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        );
                    })()}

                    <TouchableOpacity 
                        style={{
                            marginTop: 20,
                            backgroundColor: ModernColors.primary.main,
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center'
                        }}
                        onPress={() => {
                           setScheduleModalVisible(false);
                           // If filtered sessions > 0, we can go to Today's Jobs or Active Jobs
                           // router.push('/(tabs)/active-jobs');
                        }}
                    >
                        <Text style={{color: '#fff', fontSize: 16, fontWeight: '700'}}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

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
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 40,
    paddingBottom: Spacing.lg,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ModernColors.primary.dark,
    borderWidth: 3,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#16A34A', // Green for verified
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unverifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F59E0B', // Amber for unverified
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  doctorName: {
    ...Typography.h3,
    color: '#fff',
    marginBottom: 4,
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
  quickRevealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickRevealItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: ModernColors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: ModernColors.border.light,
  },
  quickRevealText: {
    flex: 1,
  },
  quickRevealValue: {
    ...Typography.h3,
    color: ModernColors.text.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  quickRevealLabel: {
    fontSize: 11,
    color: ModernColors.text.tertiary,
    marginTop: 2,
  },
  statsContainer: {
    // Analytics cards: 4 squares (2x2) like previous
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCardWrapper: {
    width: '48%', // 2 cards per row with gap; responsive for tablet/split view
    aspectRatio: 1,
    flexShrink: 0,
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
  emptyStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 280,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ModernColors.primary.light + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: ModernColors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginHorizontal: -Spacing.lg,
  },
  horizontalScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  openingsScroll: {
    marginHorizontal: -Spacing.lg,
  },
  openingsScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  openingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  openingCard: {
    // Full width card (promo section unchanged; this is openings cards)
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12, // Slightly more rounded for modern look
    overflow: 'hidden',
    marginRight: 0,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  newOpportunityCard: {
    // Full width card (one card per screen width)
    width: width - Spacing.lg * 2,
    // Prevent overflow on larger screens / inside horizontal containers
    maxWidth: width - Spacing.sm * 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    marginRight: 0,
  },
  newOpportunityImageBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '40%',
    borderRadius: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    zIndex: 0,
  },
  newOpportunityBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  newOpportunityImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  newOpportunityContentWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    paddingRight: '42%', // Space for 40% image + 2% margin
    paddingVertical: 2,
  },
  newOpportunityContentWrapperFull: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  newOpportunityCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: Spacing.sm,
  },
  newOpportunityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  newOpportunityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  newOpportunityLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  newOpportunityHeaderText: {
    flex: 1,
  },
  newOpportunityHospitalName: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    marginBottom: 3,
    fontSize: 15,
  },
  newOpportunityDepartment: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    fontSize: 12,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#EF4444',
    flexShrink: 0,
  },
  urgentBadgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#EF4444',
    zIndex: 2,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newOpportunityStatusBadgeContainer: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  newOpportunityStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: '100%',
  },
  newOpportunityStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  newOpportunityStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  postedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  postedTimeText: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    fontSize: 11,
  },
  newOpportunityDetailsContainer: {
    gap: 2,
    marginBottom: 4,
    position: 'relative',
    zIndex: 1,
  },
  newOpportunityDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newOpportunityDetailText: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    flex: 1,
    fontSize: 11,
  },
  newOpportunityPaymentContainer: {
    backgroundColor: ModernColors.primary.light + '25',
    padding: Spacing.sm + 2,
    borderRadius: 10,
    marginBottom: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: ModernColors.primary.light + '40',
  },
  newOpportunityPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newOpportunityPaymentLabel: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    fontWeight: '600',
    fontSize: 12,
  },
  newOpportunityPaymentAmount: {
    ...Typography.bodyBold,
    color: ModernColors.primary.main,
    fontSize: 18,
    fontWeight: '700',
  },
  newOpportunityApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ModernColors.primary.main,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
    marginTop: 4,
    minHeight: 28,
  },
  newOpportunityApplyButtonText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  hospitalImageContainer: {
    width: '100%',
    height: 200, // Increased height for better visual impact
    position: 'relative',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  hospitalImage: {
    width: '100%',
    height: '100%',
  },
  hospitalImagePlaceholder: {
    backgroundColor: ModernColors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: ModernColors.primary.main,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  openingCardContent: {
    padding: 18,
  },
  hospitalNameCard: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  specialtiesText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 14,
    fontWeight: '500',
  },
  rateContainer: {
    marginBottom: 16,
  },
  hourlyRate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  estimatedTotal: {
    fontSize: 13,
    color: '#64748B',
  },
  applyButton: {
    backgroundColor: ModernColors.primary.main,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    shadowColor: ModernColors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  appliedButton: {
    backgroundColor: ModernColors.success.light,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedButtonText: {
    color: ModernColors.success.main,
    fontSize: 16,
    fontWeight: '700',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    fontWeight: '500',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  paymentSubtext: {
    fontSize: 12,
    color: ModernColors.text.secondary,
    fontWeight: '400',
  },
  statusStagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statusStage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    minWidth: 0,
  },
  statusStageLine: {
    width: 12,
    height: 2,
    backgroundColor: ModernColors.border.light,
    marginHorizontal: 2,
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusStageText: {
    fontSize: 10,
    fontWeight: '600',
    color: ModernColors.text.secondary,
    flexShrink: 1,
    minWidth: 0,
  },
  activeSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ModernColors.success.light,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  activeSessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ModernColors.success.main,
  },
  activeSessionText: {
    fontSize: 12,
    fontWeight: '600',
    color: ModernColors.success.main,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: ModernColors.primary.main,
    gap: 6,
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ModernColors.primary.main,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ModernColors.success.main,
    marginRight: 8,
  },
  activeSessionsContainer: {
    gap: Spacing.md,
  },
  activeSessionCard: {
    borderWidth: 1,
    borderColor: ModernColors.border.light,
  },
  activeSessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activeSessionTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeSessionDeptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: ModernColors.neutral.gray100,
    maxWidth: 180,
  },
  activeSessionDeptText: {
    fontSize: 12,
    fontWeight: '700',
    color: ModernColors.text.primary,
  },
  activeSessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeSessionStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeSessionStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeSessionPayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  activeSessionPayText: {
    fontSize: 12,
    fontWeight: '800',
    color: ModernColors.success.main,
  },
  activeSessionHospitalName: {
    fontSize: 17,
    fontWeight: '800',
    color: ModernColors.text.primary,
    marginBottom: 8,
  },
  activeSessionDetails: {
    gap: 8,
    marginBottom: 12,
  },
  activeSessionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeSessionDetailText: {
    fontSize: 13,
    color: ModernColors.text.secondary,
    flex: 1,
  },
  processStepsContainer: {
    gap: 8,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ModernColors.border.light,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processStepCompleted: {
    opacity: 1,
  },
  processStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ModernColors.neutral.gray300,
  },
  processStepText: {
    fontSize: 12,
    color: ModernColors.text.secondary,
    fontWeight: '500',
  },
  activeSessionViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: ModernColors.primary.main,
    gap: 6,
  },
  activeSessionViewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ModernColors.primary.main,
  },
  tasksContainer: {
    gap: Spacing.md,
  },
  taskCard: {
    marginBottom: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  taskImageBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '40%',
    borderRadius: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    zIndex: 0,
  },
  taskBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  taskImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  taskContentWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    paddingRight: '42%', // Space for 40% image + 2% margin
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  taskLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  taskInfo: {
    flex: 1,
  },
  taskHospital: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    marginBottom: 2,
    fontSize: 15,
  },
  taskDepartment: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    fontSize: 12,
  },
  taskStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  taskStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  taskDetailsContainer: {
    gap: 6,
    marginBottom: Spacing.sm,
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskDetailText: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    fontSize: 12,
    flex: 1,
  },
  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  taskButtonText: {
    ...Typography.captionBold,
    color: ModernColors.primary.main,
    fontSize: 12,
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
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTimelineContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  statusTimelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusTimelineText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  actionButtonText: {
    ...Typography.captionBold,
    color: '#fff',
    fontSize: 12,
  },
  applicationsScroll: {
    marginHorizontal: -Spacing.lg,
  },
  applicationsScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  applicationCard: {
    marginBottom: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    // One card per screen width (inside horizontal scroll)
    width: width - Spacing.lg * 2,
  },
  applicationImageBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '40%',
    borderRadius: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    zIndex: 0,
  },
  applicationImageTop: {
    width: '100%',
    height: 180,
    borderRadius: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    marginTop: -Spacing.md,
    marginLeft: -Spacing.md,
    marginRight: -Spacing.md,
    alignSelf: 'stretch',
  },
  applicationBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  applicationImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  applicationContentWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    paddingRight: '42%', // Space for 40% image + 2% margin
  },
  applicationContentWrapperFull: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  applicationCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: Spacing.sm,
  },
  applicationStatusBadgeContainer: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  applicationMainStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: '100%',
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  applicationMainStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  applicationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  applicationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  applicationLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  applicationHeaderText: {
    flex: 1,
  },
  applicationHospitalName: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    marginBottom: 2,
    fontSize: 15,
  },
  applicationDepartment: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    fontSize: 12,
  },
  applicationStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  applicationStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  applicationDetailsContainer: {
    gap: 6,
    marginBottom: Spacing.sm,
    position: 'relative',
    zIndex: 1,
  },
  applicationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applicationDetailText: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    fontSize: 12,
    flex: 1,
  },
  applicationStatusStages: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexWrap: 'wrap',
    gap: 4,
  },
  statusStageIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusStagePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  applicationExpandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  applicationExpandText: {
    ...Typography.caption,
    color: ModernColors.primary.main,
    fontSize: 11,
    fontWeight: '600',
  },
  expandIcon: {
    transform: [{ rotate: '90deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '-90deg' }],
  },
});
