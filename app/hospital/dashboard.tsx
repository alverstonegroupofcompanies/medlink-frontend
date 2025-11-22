import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import { ModernColors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/modern-theme';
import { ModernCard } from '@/components/modern-card';
import API from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Plus, MapPin, Building2, Clock, X, Navigation, Bell, Menu, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HospitalSidebar from '@/components/HospitalSidebar';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import * as Location from 'expo-location';
import { DepartmentPicker } from '@/components/department-picker';
import { DatePicker } from '@/components/date-picker';
import { TimePicker } from '@/components/time-picker';

// Import MapView - Metro will automatically resolve .web or .native based on platform
import { MapViewComponent } from '@/components/MapView';

const HOSPITAL_TOKEN_KEY = 'hospitalToken';
const HOSPITAL_INFO_KEY = 'hospitalInfo';

export default function HospitalDashboard() {
  const [hospital, setHospital] = useState<any>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
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
    salary_range_min: '',
    salary_range_max: '',
  });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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

  useEffect(() => {
    // Check authentication first
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem(HOSPITAL_TOKEN_KEY);
        if (!token) {
          console.log('⚠️ Hospital not authenticated, redirecting to login...');
          router.replace('/hospital/login');
          return;
        }
        // If authenticated, load data
        loadHospital();
        loadRequirements();
        loadNotifications();
      } catch (error) {
        console.error('Error checking auth:', error);
        router.replace('/hospital/login');
      }
    };
    
    checkAuth();
    
    // Set up polling for live notifications (every 30 seconds)
    const notificationInterval = setInterval(() => {
      loadNotifications();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(notificationInterval);
  }, []);

  // Reload requirements when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Hospital dashboard focused - reloading requirements');
      loadRequirements();
      loadNotifications();
    }, [])
  );

  const loadHospital = async () => {
    try {
      const info = await AsyncStorage.getItem(HOSPITAL_INFO_KEY);
      if (info) {
        setHospital(JSON.parse(info));
      }
    } catch (error) {
      console.error('Error loading hospital:', error);
    }
  };

  const loadRequirements = async () => {
    try {
      const response = await API.get('/hospital/my-requirements');
      setRequirements(response.data.requirements || []);
    } catch (error: any) {
      console.error('Error loading requirements:', error);
    }
  };

  const [isShowingNotification, setIsShowingNotification] = useState(false);

  const loadNotifications = async () => {
    try {
      const response = await API.get('/hospital/notifications/unread-count');
      const newCount = response.data.unread_count || 0;
      const previousCount = notificationCount;
      
      // If count increased (new notification arrived), show local notification
      if (newCount > previousCount && !isShowingNotification) {
        setIsShowingNotification(true);
        try {
          // Get latest notification to show
          const notificationsResponse = await API.get('/hospital/notifications?page=1&per_page=1');
          const latestNotification = notificationsResponse.data.notifications?.[0];
          
          // Only show if this is a new unread notification
          if (latestNotification && !latestNotification.is_read) {
            // Skip local notifications on web (not supported)
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
                  latestNotification.id // Pass notification ID for deduplication
                );
              } catch (notifError) {
                console.warn('⚠️ Failed to schedule local notification:', notifError);
              }
            } else {
              // On web, just log the notification
              console.log('📬 New notification:', latestNotification.title, latestNotification.message);
            }
          }
        } catch (notifError) {
          console.warn('⚠️ Failed to show local notification:', notifError);
          // Don't break - just continue
        } finally {
          // Reset flag after a short delay to allow for proper processing
          setTimeout(() => {
            setIsShowingNotification(false);
          }, 2000);
        }
      } else {
        // Reset flag if count didn't increase (notification already processed)
        setIsShowingNotification(false);
      }
      
      setNotificationCount(newCount);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      setNotificationCount(0);
      setIsShowingNotification(false);
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
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
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
      return;
    }

    // Validate end time is after start time
    const [startHour, startMin] = formData.start_time.split(':').map(Number);
    const [endHour, endMin] = formData.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) {
      Alert.alert('Error', 'End time must be after start time');
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

    setLoading(true);
    try {
      const data: any = {
        department_id: formData.department_id,
        work_type: formData.work_type,
        required_sessions: parseInt(formData.required_sessions),
        work_required_date: formData.work_required_date, // Already in YYYY-MM-DD format
        start_time: formData.start_time, // Already in HH:MM format
        end_time: formData.end_time, // Already in HH:MM format
        duration_hours: parseFloat(formData.duration_hours),
        description: formData.description?.trim() || null,
        location_name: formData.location_name?.trim() || null,
        address: formData.address?.trim() || null,
      };

      if (location) {
        data.latitude = location.latitude;
        data.longitude = location.longitude;
      }

      if (formData.salary_range_min && formData.salary_range_min.trim()) {
        const minSalary = parseFloat(formData.salary_range_min);
        if (!isNaN(minSalary) && minSalary >= 0) {
          data.salary_range_min = minSalary;
        }
      }
      
      if (formData.salary_range_max && formData.salary_range_max.trim()) {
        const maxSalary = parseFloat(formData.salary_range_max);
        if (!isNaN(maxSalary) && maxSalary >= 0) {
          data.salary_range_max = maxSalary;
        }
      }

      await API.post('/hospital/requirements', data);
      Alert.alert('Success', 'Job requirement posted successfully!');
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
        salary_range_min: '',
        salary_range_max: '',
      });
      setLocation(null);
      loadRequirements();
    } catch (error: any) {
      console.error('Error posting requirement:', error);
      let message = 'Failed to post requirement. Please try again.';
      
      if (error.message?.includes('Network') || error.message?.includes('connect')) {
        message = 'Cannot connect to server. Please check your connection.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Format validation errors nicely
        const errors = error.response.data.errors;
        const errorMessages = Object.entries(errors).map(([field, messages]: [string, any]) => {
          const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `${fieldName}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
        });
        message = errorMessages.join('\n');
      }
      
      Alert.alert('Validation Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this requirement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.delete(`/hospital/requirements/${id}`);
            loadRequirements();
          } catch (error: any) {
            console.error('Error deleting requirement:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete requirement');
          }
        },
      },
    ]);
  };

  const performHospitalLogout = async () => {
    console.log('✅ Hospital logout confirmed, starting process...');
    try {
      // Try to call backend logout API
      console.log('📞 Calling backend logout API...');
      const response = await API.post('/hospital/logout');
      console.log('✅ Backend logout successful');
      console.log('📊 Backend response:', response.data);
      if (response.data?.tokens_deleted) {
        console.log(`🗑️ Deleted ${response.data.tokens_deleted} token(s) from backend`);
      }
    } catch (error: any) {
      // Continue with logout even if backend call fails
      console.warn('⚠️ Backend logout failed, continuing with local logout');
      console.warn('⚠️ Error details:', error?.response?.data || error?.message || error);
      // Don't throw - continue with local logout
    }
    
    // Clear all hospital auth data
    try {
      console.log('🧹 Clearing hospital auth data...');
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
        console.log('✅ Hospital auth data cleared successfully');
      }
    } catch (clearError) {
      console.error('❌ Error clearing hospital auth:', clearError);
      console.error('❌ Clear error details:', JSON.stringify(clearError, null, 2));
    }
    
    // Navigate directly to login page
    console.log('🔄 Navigating to login page...');
    try {
      router.replace('/hospital/login');
      console.log('✅ Hospital logout navigation completed');
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
    console.log('🔘 Hospital logout button pressed');
    Keyboard.dismiss();
    // Show custom modal instead of Alert
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    console.log('✅ User confirmed hospital logout - starting logout process');
    setShowLogoutModal(false);
    performHospitalLogout().catch((error) => {
      console.error('❌ Error in performHospitalLogout:', error);
    });
  };

  const cancelLogout = () => {
    console.log('❌ Hospital logout cancelled by user');
    setShowLogoutModal(false);
  };

  return (
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={ModernColors.secondary.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modernHeader}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                onPress={() => setShowSidebar(true)}
                style={styles.menuButton}
              >
                <Menu size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.welcomeText}>Welcome back!</Text>
                <Text style={styles.hospitalNameText}>
                  {hospital?.name || 'Hospital'}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => router.push('/hospital/notifications')}
              >
                <Bell size={22} color="#fff" />
                {notificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {notificationCount > 99 ? '99+' : notificationCount.toString()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: PrimaryColors.main }]}>
            <View style={styles.statIconContainer}>
              <Building2 size={24} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{requirements.length}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
            <View style={styles.statIconContainer}>
              <Calendar size={24} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{notificationCount}</Text>
              <Text style={styles.statLabel}>Notifications</Text>
            </View>
          </View>
        </View>

        {!showForm ? (
          <>
            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: PrimaryColors.main }]}
                onPress={() => setShowForm(true)}
              >
                <View style={styles.quickActionIcon}>
                  <Plus size={24} color="#fff" />
                </View>
                <View style={styles.quickActionText}>
                  <Text style={styles.quickActionTitle}>Post Job</Text>
                  <Text style={styles.quickActionSubtitle}>Create new requirement</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: '#8B5CF6' }]}
                onPress={() => router.push('/hospital/live-tracking')}
              >
                <View style={styles.quickActionIcon}>
                  <Navigation size={24} color="#fff" />
                </View>
                <View style={styles.quickActionText}>
                  <Text style={styles.quickActionTitle}>Live Tracking</Text>
                  <Text style={styles.quickActionSubtitle}>View doctor locations</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Requirements Section */}
            <View style={styles.requirementsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.sectionIconContainer, { backgroundColor: `${PrimaryColors.main}15` }]}>
                    <Building2 size={20} color={PrimaryColors.main} />
                  </View>
                  <View>
                    <Text style={styles.sectionTitle}>Posted Requirements</Text>
                    <Text style={styles.sectionSubtitle}>{requirements.length} active job{requirements.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              </View>

              {requirements.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Building2 size={48} color={NeutralColors.textTertiary} />
                  <Text style={styles.emptyTitle}>No Requirements Yet</Text>
                  <Text style={styles.emptySubtitle}>Post your first job requirement to get started</Text>
                  <TouchableOpacity
                    style={[styles.emptyActionButton, { backgroundColor: PrimaryColors.main }]}
                    onPress={() => setShowForm(true)}
                  >
                    <Plus size={18} color="#fff" />
                    <Text style={styles.emptyActionText}>Post First Requirement</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                requirements.map((req) => (
                  <View key={req.id} style={styles.modernRequirementCard}>
                    <View style={styles.modernCardHeader}>
                      <View style={styles.modernCardHeaderLeft}>
                        <View style={[styles.departmentBadge, { backgroundColor: `${PrimaryColors.main}15` }]}>
                          <Text style={[styles.departmentText, { color: PrimaryColors.main }]}>
                            {req.department}
                          </Text>
                        </View>
                        <View style={styles.cardMeta}>
                          <Text style={styles.cardWorkType}>{req.work_type.replace('-', ' ').toUpperCase()}</Text>
                          <Text style={styles.cardSessions}>{req.required_sessions} session{req.required_sessions !== 1 ? 's' : ''}</Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleDelete(req.id)}
                        style={styles.deleteButton}
                      >
                        <X size={18} color={StatusColors.error} />
                      </TouchableOpacity>
                    </View>
                    
                    {req.description && (
                      <Text style={styles.modernCardDescription} numberOfLines={2}>
                        {req.description}
                      </Text>
                    )}
                    
                    {req.address && (
                      <View style={styles.modernLocationRow}>
                        <MapPin size={14} color={NeutralColors.textTertiary} />
                        <Text style={styles.modernLocationText} numberOfLines={1}>
                          {req.address}
                        </Text>
                      </View>
                    )}

                    {req.work_required_date && (
                      <View style={styles.modernDateRow}>
                        <Clock size={14} color={NeutralColors.textTertiary} />
                        <Text style={styles.modernDateText}>
                          {new Date(req.work_required_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.modernViewButton}
                      onPress={() => router.push({
                        pathname: '/hospital/applications/[requirementId]',
                        params: { requirementId: req.id.toString() }
                      })}
                    >
                      <Text style={styles.modernViewButtonText}>View Applications</Text>
                      <Text style={styles.modernViewButtonArrow}>→</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <View style={[styles.formCard, { backgroundColor: NeutralColors.cardBackground }]}>
            <View style={styles.formHeader}>
              <ThemedText style={[styles.formTitle, { color: PrimaryColors.main }]}>
                Post Job Requirement
              </ThemedText>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <X size={24} color={NeutralColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Department *</ThemedText>
              <DepartmentPicker
                value={formData.department_id}
                onValueChange={(id) => setFormData({ ...formData, department_id: id })}
                placeholder="Select department"
                required
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Work Type *</ThemedText>
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
                    <ThemedText
                      style={[
                        styles.workTypeText,
                        formData.work_type === type && { color: '#fff' },
                      ]}
                    >
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Required Sessions *</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Number of sessions"
                value={formData.required_sessions}
                onChangeText={(text) => setFormData({ ...formData, required_sessions: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Work Required Date *</ThemedText>
              <DatePicker
                value={formData.work_required_date}
                onValueChange={(date) => setFormData({ ...formData, work_required_date: date })}
                placeholder="Select work required date"
                required
                minimumDate={new Date()}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Start Time *</ThemedText>
              <TimePicker
                value={formData.start_time}
                onValueChange={(time) => setFormData({ ...formData, start_time: time })}
                placeholder="Select start time"
                required
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>End Time *</ThemedText>
              <TimePicker
                value={formData.end_time}
                onValueChange={(time) => setFormData({ ...formData, end_time: time })}
                placeholder="Select end time"
                required
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Duration (Hours) *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: NeutralColors.cardBackground, opacity: 0.7 }]}
                placeholder="Auto-calculated"
                value={formData.duration_hours}
                onChangeText={(text) => setFormData({ ...formData, duration_hours: text })}
                keyboardType="numeric"
                editable={true}
              />
              <ThemedText style={[styles.helpText, { color: NeutralColors.textSecondary }]}>
                Auto-calculated from start and end time (editable if needed)
              </ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Description</ThemedText>
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
              <ThemedText style={styles.label}>Location Name</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="e.g., Main Hospital, Branch Clinic"
                value={formData.location_name}
                onChangeText={(text) => setFormData({ ...formData, location_name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Address</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Full address"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Location on Map *</ThemedText>
              <Text style={styles.mapHint}>
                Tap on the map to select location or use current location button
              </Text>
              <MapViewComponent
                initialLocation={location || undefined}
                onLocationSelect={(loc) => {
                  setLocation(loc);
                }}
                height={280}
                showCurrentLocationButton={true}
              />
              {location && (
                <View style={styles.locationDisplay}>
                  <MapPin size={16} color={StatusColors.success} />
                  <Text style={styles.locationDisplayText}>
                    Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Salary Range (Optional)</ThemedText>
              <View style={styles.salaryRow}>
                <TextInput
                  style={[styles.input, styles.salaryInput]}
                  placeholder="Min"
                  value={formData.salary_range_min}
                  onChangeText={(text) => setFormData({ ...formData, salary_range_min: text })}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.salaryInput]}
                  placeholder="Max"
                  value={formData.salary_range_max}
                  onChangeText={(text) => setFormData({ ...formData, salary_range_max: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <ThemedButton
              title="Post Requirement"
              onPress={handleSubmit}
              loading={loading}
              style={[styles.submitButton, { backgroundColor: PrimaryColors.main }]}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
    
    {/* Sidebar Menu */}
    <HospitalSidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeutralColors.background },
  scrollView: { flex: 1 },
  content: { paddingBottom: 100 },
  modernHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 4,
  },
  hospitalNameText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
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
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: PrimaryColors.lighter,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  requirementsSection: {
    paddingHorizontal: 20,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  addButton: {
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: PrimaryColors.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
  },
  addButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: NeutralColors.textTertiary,
    fontWeight: '500',
  },
  emptyStateCard: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: NeutralColors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: NeutralColors.textTertiary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modernRequirementCard: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: NeutralColors.border,
  },
  modernCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modernCardHeaderLeft: {
    flex: 1,
  },
  departmentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  departmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardWorkType: {
    fontSize: 11,
    fontWeight: '700',
    color: NeutralColors.textTertiary,
    letterSpacing: 0.5,
  },
  cardSessions: {
    fontSize: 11,
    color: NeutralColors.textTertiary,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${StatusColors.error}15`,
  },
  modernCardDescription: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  modernLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  modernLocationText: {
    fontSize: 13,
    color: NeutralColors.textTertiary,
    flex: 1,
  },
  modernDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  modernDateText: {
    fontSize: 13,
    color: NeutralColors.textTertiary,
    fontWeight: '500',
  },
  modernViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: `${PrimaryColors.main}10`,
    borderWidth: 1,
    borderColor: `${PrimaryColors.main}20`,
  },
  modernViewButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  modernViewButtonArrow: {
    fontSize: 18,
    color: PrimaryColors.main,
    fontWeight: '700',
  },
  formCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: { fontSize: 20, fontWeight: '700' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '700', marginBottom: 10, color: PrimaryColors.dark },
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
        shadowColor: PrimaryColors.accent,
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
});

