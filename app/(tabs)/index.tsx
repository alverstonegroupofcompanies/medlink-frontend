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
} from "react-native";
import { Star, Bell, MapPin, Calendar, TrendingUp, Award, Clock, Building2 } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { calculateProfileCompletion } from "@/utils/profileCompletion";
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors, DoctorNeutralColors as NeutralColors, DoctorSecondaryColors as SecondaryColors } from "@/constants/doctor-theme";
import { logoutDoctor, getDoctorInfo, isDoctorLoggedIn } from "@/utils/auth";
import API from "../api";

const { width } = Dimensions.get('window');

export default function DoctorHome() {
  const [doctor, setDoctor] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [selectedDate, setSelectedDate] = useState(15);
  const [rating] = useState(4.5);
  const [jobRequirements, setJobRequirements] = useState<any[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);

  const loadDoctor = async () => {
    try {
      // Check if doctor is authenticated first
      const isLoggedIn = await isDoctorLoggedIn();
      if (!isLoggedIn) {
        console.log('⚠️ Doctor not authenticated, redirecting to login...');
        router.replace('/login');
        return;
      }

      const info = await getDoctorInfo();
      if (info) {
        setDoctor(info);
        const completion = calculateProfileCompletion(info);
        setProgress(completion);
      } else {
        // No doctor info found, redirect to login
        console.log('⚠️ No doctor info found, redirecting to login...');
        router.replace('/login');
      }
    } catch (error) {
      console.error("Error loading doctor:", error);
      // On error, redirect to login
      router.replace('/login');
    }
  };

  const loadJobRequirements = async () => {
    setLoadingRequirements(true);
    try {
      // Get job requirements with application status for logged-in doctors
      const response = await API.get('/doctor/job-requirements');
      setJobRequirements(response.data.requirements || []);
    } catch (error: any) {
      console.error("Error loading job requirements:", error);
      // If endpoint fails, fallback to public endpoint
      try {
        const fallbackResponse = await API.get('/job-requirements');
        setJobRequirements(fallbackResponse.data.requirements || []);
      } catch (fallbackError) {
        console.error("Error loading job requirements (fallback):", fallbackError);
      }
    } finally {
      setLoadingRequirements(false);
    }
  };

  const handleApply = async (requirementId: number) => {
    try {
      const response = await API.post('/doctor/apply', {
        job_requirement_id: requirementId,
      });
      
      Alert.alert('Success', 'Application submitted successfully! Waiting for hospital approval.');
      // Reload requirements to update status
      loadJobRequirements();
    } catch (error: any) {
      console.error('Apply error:', error);
      const message = error.response?.data?.message || 'Failed to submit application';
      Alert.alert('Error', message);
    }
  };

  useEffect(() => {
    loadDoctor();
    loadJobRequirements();
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadDoctor();
        loadJobRequirements();
      }
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDoctor();
      loadJobRequirements();
    }, [])
  );

  const renderStars = (count: number, total: number = 5) => {
    return (
      <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}>
        {Array.from({ length: total }).map((_, i) => (
          <Star
            key={i}
            size={14}
            color={i < count ? "#FFB800" : "#E5E7EB"}
            fill={i < count ? "#FFB800" : "transparent"}
          />
        ))}
        <Text style={styles.ratingText}>{count.toFixed(1)}</Text>
      </View>
    );
  };

  const dates = [14, 15, 16, 17, 18];
  const stats = [
    { label: "Active Jobs", value: "12", icon: Building2, color: PrimaryColors.main },
    { label: "Upcoming", value: "5", icon: Calendar, color: SecondaryColors.accent },
    { label: "Rating", value: "4.8", icon: Star, color: "#FFB800" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.main} />
      
      {/* Premium Header with Gradient */}
      <LinearGradient
        colors={[PrimaryColors.main, PrimaryColors.light]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: doctor?.profile_photo || "https://i.pravatar.cc/150?img=1" }}
                style={styles.profileImage}
              />
              <View style={styles.verifiedBadge}>
                <Award size={12} color="#fff" fill="#fff" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.greetingText}>Good Morning</Text>
              <Text style={styles.doctorName}>{doctor?.name || "Dr. User"}</Text>
              {renderStars(rating)}
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={22} color="#fff" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Profile Completion</Text>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
          {progress < 1 && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.completeButtonText}>Complete Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
                  <IconComponent size={24} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            );
          })}
        </View>

        {/* New Openings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <TrendingUp size={20} color={PrimaryColors.main} />
              <Text style={styles.sectionTitle}>New Openings</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {loadingRequirements ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading openings...</Text>
            </View>
          ) : jobRequirements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No job openings available</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.openingsScroll}>
              {jobRequirements.slice(0, 5).map((requirement) => (
                <View key={requirement.id} style={styles.openingCard}>
                  <View style={styles.openingHeader}>
                    <View style={styles.hospitalIcon}>
                      <Building2 size={20} color={PrimaryColors.main} />
                    </View>
                    <View style={styles.openingInfo}>
                      <Text style={styles.hospitalName} numberOfLines={1}>
                        {requirement.hospital?.name || 'Hospital'}
                      </Text>
                      <Text style={styles.departmentText}>{requirement.department}</Text>
                    </View>
                  </View>
                  <View style={styles.openingDetails}>
                    <View style={styles.detailRow}>
                      <Clock size={14} color={NeutralColors.textSecondary} />
                      <Text style={styles.detailText}>{requirement.work_type}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Calendar size={14} color={NeutralColors.textSecondary} />
                      <Text style={styles.detailText}>{requirement.required_sessions} sessions</Text>
                    </View>
                    {requirement.address && (
                      <View style={styles.detailRow}>
                        <MapPin size={14} color={NeutralColors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>{requirement.address}</Text>
                      </View>
                    )}
                  </View>
                  {requirement.has_applied ? (
                    <View style={[
                      styles.applyButton, 
                      styles.appliedButton,
                      requirement.application_status === 'rejected' && { backgroundColor: StatusColors.error + '20' },
                      requirement.application_status === 'selected' && { backgroundColor: StatusColors.success + '20' },
                    ]}>
                      <Text style={[
                        styles.appliedButtonText,
                        requirement.application_status === 'rejected' && { color: StatusColors.error },
                        requirement.application_status === 'selected' && { color: StatusColors.success },
                      ]}>
                        {requirement.application_status === 'pending' 
                          ? 'Waiting for Approval' 
                          : requirement.application_status === 'selected'
                          ? 'Selected ✓'
                          : requirement.application_status === 'rejected'
                          ? 'Rejected ✗'
                          : 'Applied'}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.applyButton}
                      onPress={() => handleApply(requirement.id)}
                    >
                      <Text style={styles.applyButtonText}>Apply Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Upcoming Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Calendar size={20} color={SecondaryColors.accent} />
              <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
            {dates.map((date) => (
              <TouchableOpacity
                key={date}
                style={[
                  styles.dateCard,
                  selectedDate === date && styles.dateCardActive,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  styles.dateText,
                  selectedDate === date && styles.dateTextActive,
                ]}>
                  {date}
                </Text>
                <Text style={[
                  styles.dayText,
                  selectedDate === date && styles.dayTextActive,
                ]}>
                  {date === 15 ? 'Today' : 'Mon'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.taskCard}>
            <View style={styles.taskTimeContainer}>
              <Text style={styles.taskTime}>09:00</Text>
              <Text style={styles.taskTimeEnd}>01:00 PM</Text>
            </View>
            <View style={styles.taskDetails}>
              <Text style={styles.taskTitle}>Morning Shift</Text>
              <Text style={styles.taskHospital}>Alverstone Medcity</Text>
              <View style={styles.taskLocation}>
                <MapPin size={12} color={NeutralColors.textSecondary} />
                <Text style={styles.taskLocationText}>Main Building, Floor 3</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.background,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: StatusColors.success,
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
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 12,
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
    backgroundColor: StatusColors.error,
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
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: PrimaryColors.lightest,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PrimaryColors.main,
    borderRadius: 4,
  },
  completeButton: {
    backgroundColor: PrimaryColors.main,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  openingsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  openingCard: {
    width: width * 0.75,
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  openingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hospitalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PrimaryColors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  openingInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 2,
  },
  departmentText: {
    fontSize: 13,
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  openingDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    flex: 1,
  },
  applyButton: {
    backgroundColor: PrimaryColors.main,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  appliedButton: {
    backgroundColor: NeutralColors.divider,
  },
  appliedButtonText: {
    color: NeutralColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  datesScroll: {
    marginBottom: 16,
  },
  dateCard: {
    width: 70,
    height: 80,
    borderRadius: 16,
    backgroundColor: NeutralColors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateCardActive: {
    backgroundColor: PrimaryColors.main,
    borderColor: PrimaryColors.light,
  },
  dateText: {
    fontSize: 24,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  dateTextActive: {
    color: '#fff',
  },
  dayText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    fontWeight: '600',
  },
  dayTextActive: {
    color: '#fff',
  },
  taskCard: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  taskTimeContainer: {
    alignItems: 'center',
    marginRight: 16,
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: NeutralColors.divider,
  },
  taskTime: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.main,
    marginBottom: 2,
  },
  taskTimeEnd: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  taskHospital: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginBottom: 6,
  },
  taskLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskLocationText: {
    fontSize: 12,
    color: NeutralColors.textTertiary,
  },
  viewButton: {
    backgroundColor: PrimaryColors.lightest,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewButtonText: {
    color: PrimaryColors.main,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: NeutralColors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: NeutralColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
