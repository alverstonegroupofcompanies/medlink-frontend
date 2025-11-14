import React, { useState, useEffect } from 'react';
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
import API from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Plus, MapPin, Building2, Clock, X, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import { MapViewComponent } from '@/components/MapView';

const HOSPITAL_TOKEN_KEY = 'hospitalToken';
const HOSPITAL_INFO_KEY = 'hospitalInfo';

export default function HospitalDashboard() {
  const [hospital, setHospital] = useState<any>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [formData, setFormData] = useState({
    department: '',
    work_type: 'full-time',
    required_sessions: '1',
    description: '',
    location_name: '',
    address: '',
    salary_range_min: '',
    salary_range_max: '',
  });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    loadHospital();
    loadRequirements();
  }, []);

  // Reload requirements when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Hospital dashboard focused - reloading requirements');
      loadRequirements();
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
    if (!formData.department || !formData.work_type || !formData.required_sessions) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        department: formData.department,
        work_type: formData.work_type,
        required_sessions: parseInt(formData.required_sessions),
        description: formData.description,
        location_name: formData.location_name,
        address: formData.address,
      };

      if (location) {
        data.latitude = location.latitude;
        data.longitude = location.longitude;
      }

      if (formData.salary_range_min) {
        data.salary_range_min = parseFloat(formData.salary_range_min);
      }
      if (formData.salary_range_max) {
        data.salary_range_max = parseFloat(formData.salary_range_max);
      }

      await API.post('/hospital/requirements', data);
      Alert.alert('Success', 'Job requirement posted successfully!');
      setShowForm(false);
      setFormData({
        department: '',
        work_type: 'full-time',
        required_sessions: '1',
        description: '',
        location_name: '',
        address: '',
        salary_range_min: '',
        salary_range_max: '',
      });
      setLocation(null);
      loadRequirements();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to post requirement');
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
          } catch (error) {
            Alert.alert('Error', 'Failed to delete requirement');
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
    
    // Navigate directly to login page - use multiple attempts to ensure it works
    console.log('🔄 Navigating to login page...');
    const navigateToLogin = () => {
      try {
        console.log('🔄 Attempting navigation to /hospital/login...');
        router.dismissAll();
        router.replace('/hospital/login');
        console.log('✅ Hospital logout navigation completed');
      } catch (navError) {
        console.error('❌ Hospital logout navigation error:', navError);
        // Try alternative
        try {
          router.dismissAll();
          router.push('/hospital/login');
          console.log('✅ Alternative navigation (push) completed');
        } catch (altError) {
          console.error('❌ Alternative navigation also failed:', altError);
          // Last resort: try regular login
          try {
            router.dismissAll();
            router.replace('/login');
          } catch (rootError) {
            console.error('❌ Root navigation also failed:', rootError);
          }
        }
      }
    };

    // Try navigation immediately
    navigateToLogin();
    
    // Also try after a short delay to ensure it works
    setTimeout(() => {
      console.log('🔄 Retry navigation to /hospital/login after delay...');
      navigateToLogin();
    }, 500);
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
    <>
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
        <View style={[styles.headerCard, { backgroundColor: PrimaryColors.lighter }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <ThemedText style={[styles.title, { color: PrimaryColors.dark }]}>
                {hospital?.name || 'Hospital Dashboard'}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: NeutralColors.textSecondary }]}>
                Manage job requirements and locations
              </ThemedText>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <ThemedText style={styles.logoutText}>Logout</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {!showForm ? (
          <>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: PrimaryColors.main }]}
              onPress={() => setShowForm(true)}
            >
              <View style={styles.addButtonContent}>
                <View style={styles.addButtonIcon}>
                  <Plus size={22} color="#fff" />
                </View>
                <ThemedText style={styles.addButtonText}>Post New Requirement</ThemedText>
              </View>
            </TouchableOpacity>

            <View style={styles.requirementsList}>
              <View style={styles.sectionHeader}>
                <Building2 size={20} color={PrimaryColors.main} />
                <ThemedText style={[styles.sectionTitle, { color: PrimaryColors.dark }]}>
                  My Posted Requirements
                </ThemedText>
              </View>
              {requirements.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyText}>No requirements posted yet</ThemedText>
                </View>
              ) : (
                requirements.map((req) => (
                  <View key={req.id} style={[styles.requirementCard, { backgroundColor: NeutralColors.cardBackground }]}>
                    <View style={styles.cardHeader}>
                      <View>
                        <ThemedText style={styles.cardTitle}>{req.department}</ThemedText>
                        <ThemedText style={[styles.cardSubtitle, { color: NeutralColors.textSecondary }]}>
                          {req.work_type} • {req.required_sessions} session(s)
                        </ThemedText>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(req.id)}>
                        <X size={20} color={StatusColors.error} />
                      </TouchableOpacity>
                    </View>
                    {req.description && (
                      <ThemedText style={styles.cardDescription}>{req.description}</ThemedText>
                    )}
                    {req.address && (
                      <View style={styles.locationRow}>
                        <MapPin size={16} color={PrimaryColors.main} />
                        <ThemedText style={styles.locationText}>{req.address}</ThemedText>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.viewApplicationsButton, { backgroundColor: PrimaryColors.main }]}
                      onPress={() => router.push({
                        pathname: '/hospital/applications/[requirementId]',
                        params: { requirementId: req.id.toString() }
                      })}
                    >
                      <ThemedText style={styles.viewApplicationsText}>View Applications</ThemedText>
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
              <TextInput
                style={styles.input}
                placeholder="e.g., Cardiology, Emergency, ICU"
                value={formData.department}
                onChangeText={(text) => setFormData({ ...formData, department: text })}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeutralColors.background },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  headerCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: StatusColors.error,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600' },
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
  requirementsList: { marginTop: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: PrimaryColors.lighter,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: NeutralColors.textSecondary },
  requirementCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 12 },
  cardDescription: { fontSize: 14, marginTop: 8, color: NeutralColors.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  locationText: { fontSize: 12, color: PrimaryColors.main },
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
});

