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
  Image,
} from 'react-native';
import { Card, Surface, Button, useTheme, Chip, Avatar, FAB } from 'react-native-paper';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Plus, MapPin, Building2, Clock, X, Navigation, Bell, Menu } from 'lucide-react-native';
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
  const theme = useTheme();
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
  }, []);

  // Reload requirements when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Hospital dashboard focused - reloading requirements');
      loadRequirements();
      loadNotifications();
      
      // Set up polling for live notifications (every 60 seconds, only when focused)
      const notificationInterval = setInterval(() => {
        loadNotifications();
      }, 60000); // Poll every 60 seconds (reduced from 30)
      
      // Cleanup interval when screen loses focus
      return () => {
        clearInterval(notificationInterval);
      };
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
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={true}
        >
        {/* Minimal Header */}
        <Surface style={styles.headerSurface} elevation={0}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => setShowSidebar(true)}
              style={styles.menuIcon}
            >
              <Menu size={20} color="#2563EB" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.hospitalName} numberOfLines={1}>
                {hospital?.name || 'Hospital'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/hospital/notifications')}
              style={styles.bellIcon}
            >
              <Bell size={20} color="#2563EB" />
              {notificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Surface>

        {/* Statistics Cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard} mode="outlined">
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
                <Building2 size={20} color="#2563EB" />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statValue}>{requirements.length}</Text>
                <Text style={styles.statLabel}>Active Jobs</Text>
              </View>
            </Card.Content>
          </Card>
          <Card style={styles.statCard} mode="outlined">
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
                <Bell size={20} color="#10B981" />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statValue}>{notificationCount}</Text>
                <Text style={styles.statLabel}>Notifications</Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {!showForm ? (
          <>
            {/* Quick Actions */}
            <View style={styles.actionsRow}>
              <Button
                mode="contained"
                onPress={() => setShowForm(true)}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
                buttonColor="#2563EB"
                textColor="#fff"
                icon={() => <Plus size={18} color="#fff" />}
              >
                Post Job
              </Button>
              <Button
                mode="outlined"
                onPress={() => router.push('/hospital/live-tracking')}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
                textColor="#2563EB"
                icon={() => <Navigation size={18} color="#2563EB" />}
              >
                Live Tracking
              </Button>
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
                      onPress={() => setShowForm(true)}
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
                  <Card key={req.id} style={styles.requirementCard} mode="outlined">
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Chip 
                          style={[styles.deptChip, { backgroundColor: '#EFF6FF' }]}
                          textStyle={{ color: '#2563EB', fontSize: 13, fontWeight: '500' }}
                        >
                          {req.department}
                        </Chip>
                        <TouchableOpacity 
                          onPress={() => handleDelete(req.id)}
                          style={styles.deleteIcon}
                        >
                          <X size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.cardMeta}>
                        <Chip 
                          style={styles.metaChip}
                          textStyle={styles.metaChipText}
                          mode="outlined"
                        >
                          {req.work_type.replace('-', ' ')}
                        </Chip>
                        <Chip 
                          style={styles.metaChip}
                          textStyle={styles.metaChipText}
                          mode="outlined"
                        >
                          {req.required_sessions} session{req.required_sessions !== 1 ? 's' : ''}
                        </Chip>
                      </View>
                      
                      {req.description && (
                        <Text style={styles.cardDescription} numberOfLines={2}>
                          {req.description}
                        </Text>
                      )}
                      
                      {req.address && (
                        <View style={styles.cardInfoRow}>
                          <MapPin size={14} color="#6B7280" />
                          <Text style={styles.cardInfoText} numberOfLines={1}>
                            {req.address}
                          </Text>
                        </View>
                      )}

                      {req.work_required_date && (
                        <View style={styles.cardInfoRow}>
                          <Clock size={14} color="#6B7280" />
                          <Text style={styles.cardInfoText}>
                            {new Date(req.work_required_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                      )}

                      {/* Applicants Preview */}
                      <View style={styles.applicantsRow}>
                        {req.applications && req.applications.length > 0 ? (
                          <>
                            <View style={styles.avatarsContainer}>
                              {req.applications.slice(0, 5).map((application: any, index: number) => {
                                const doctor = application.doctor;
                                const profilePhoto = doctor?.profile_photo_url || doctor?.profile_photo;
                                return profilePhoto ? (
                                  <Avatar.Image
                                    key={`avatar-${application.id}-${index}`}
                                    size={32}
                                    source={{ uri: profilePhoto }}
                                    style={[styles.avatar, { marginLeft: index > 0 ? -8 : 0 }]}
                                  />
                                ) : (
                                  <Avatar.Text
                                    key={`avatar-text-${application.id}-${index}`}
                                    size={32}
                                    label={doctor?.name?.charAt(0)?.toUpperCase() || '?'}
                                    style={[styles.avatar, { marginLeft: index > 0 ? -8 : 0 }]}
                                  />
                                );
                              })}
                              {req.applications.length > 5 && (
                                <Avatar.Text
                                  key={`avatar-more-${req.id}`}
                                  size={32}
                                  label={`+${req.applications.length - 5}`}
                                  style={[styles.avatar, { marginLeft: -8, backgroundColor: '#E5E7EB' }]}
                                  labelStyle={{ color: '#6B7280', fontSize: 11, fontWeight: '500' }}
                                />
                              )}
                            </View>
                            <Text style={styles.applicantsCount}>
                              {req.applications.length} {req.applications.length === 1 ? 'applicant' : 'applicants'}
                            </Text>
                          </>
                        ) : (
                          <Text style={[styles.applicantsCount, { color: '#9CA3AF' }]}>No applicants yet</Text>
                        )}
                      </View>

                      <Button
                        mode="text"
                        onPress={() => router.push({
                          pathname: '/hospital/applications/[requirementId]',
                          params: { requirementId: req.id.toString() }
                        })}
                        style={styles.viewButton}
                        labelStyle={styles.viewButtonLabel}
                        textColor="#2563EB"
                        icon={() => <Text style={styles.viewButtonIcon}>→</Text>}
                      >
                        View Applications
                      </Button>
                    </Card.Content>
                  </Card>
                ))
              )}
            </View>
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
              <Text style={styles.label}>Location on Map *</Text>
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
              <Text style={styles.label}>Salary Range (Optional)</Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
    
    {/* Sidebar Menu */}
    <HospitalSidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  content: { 
    paddingBottom: 24,
  },
  headerSurface: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    padding: 8,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
    marginBottom: 2,
  },
  hospitalName: {
    fontSize: 20,
    color: '#111827',
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  countChip: {
    backgroundColor: '#EFF6FF',
    height: 24,
  },
  countChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
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
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 180,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deptChip: {
    height: 28,
  },
  deleteIcon: {
    padding: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaChip: {
    height: 26,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  cardDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '400',
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardInfoText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    fontWeight: '400',
  },
  applicantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    width: 'auto',
  },
  avatar: {
    borderWidth: 2,
    borderColor: '#fff',
    width: 32,
    height: 32,
  },
  applicantsCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  viewButton: {
    marginTop: 4,
  },
  viewButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewButtonIcon: {
    fontSize: 16,
    color: '#2563EB',
    marginLeft: 4,
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
    fontSize: 18,
    fontWeight: '600',
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
});

