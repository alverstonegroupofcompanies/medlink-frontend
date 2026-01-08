import { FileUploadButton } from '@/components/file-upload-button';
import { MultiDepartmentPicker } from '@/components/multi-department-picker'; // Changed from DepartmentPicker
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api';






import { API_BASE_URL } from '../../config/api';
import { calculateProfileCompletion } from '@/utils/profileCompletion';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { saveDoctorAuth } from '@/utils/auth';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfessionalDetailsScreen() {
  const navParams = useLocalSearchParams();
  const [params, setParams] = useState<any>(navParams);
  const colorScheme = useColorScheme();
  const [formData, setFormData] = useState({
    professionalAchievements: '',
    medicalCouncilRegNo: '',
    qualifications: '',
    // specialization: '', // Removed
    department_ids: [] as number[], // Changed to array
    experience: '',
    currentHospital: '',
    currentLocation: '',
    preferredWorkType: '',
    preferredLocation: '',
  });
  const [files, setFiles] = useState<Record<string, { uri: string; name: string; type: string }>>({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  // Work Type Modal State
  const [workTypeModalVisible, setWorkTypeModalVisible] = useState(false);
  const workTypeOptions = ['Full Time', 'Part Time', 'Session'];

  useEffect(() => {
    loadRegistrationData();
  }, []);

  const loadRegistrationData = async () => {
    try {
      // If we have data in nav params (legacy flow), use it
      if (navParams.fullName && navParams.emailId) {
        setParams(navParams);
        setInitializing(false);
        return;
      }

      // Otherwise try loading from storage
      const stored = await AsyncStorage.getItem('doctorRegistrationData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setParams({ ...navParams, ...parsed });
      } else {
         // No data found anywhere
         Alert.alert('Error', 'Registration session missing. Please start over.');
         router.replace('/signup/basic-details');
      }
    } catch (e) {
      console.error('Failed to load registration data', e);
    } finally {
      setInitializing(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (key: string, uri: string, name: string, type: string) => {
    setFiles(prev => ({ ...prev, [key]: { uri, name, type } }));
  };

  const handleSubmit = async () => {
    if (!params.emailId || !params.password || !params.fullName) {
      Alert.alert('Error', 'Missing basic details.');
      return;
    }

    if (!params.otp) {
      Alert.alert('Error', 'Email verification required. Please verify your email first.');
      return;
    }

    if (!formData.department_ids || formData.department_ids.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one department.');
        return;
    }

    setLoading(true);
    try {
      const data = new FormData();

      // Basic Details
      data.append('name', params.fullName);
      data.append('email', params.emailId);
      data.append('password', params.password);
      data.append('otp', params.otp as string);
      data.append('phone_number', params.phoneNumber || '');

      // Professional Details
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'department_ids') {
             // Handle array properly for FormData
             (value as number[]).forEach((id, index) => {
                 data.append(`department_ids[${index}]`, id.toString());
             });
             // Also send primary department_id for backward compatibility
             if ((value as number[]).length > 0) {
                 data.append('department_id', (value as number[])[0].toString());
             }
        } else if (value !== null && value !== '') {
          data.append(key, value as string);
        }
      });

      // Files - Fix file URI for Android/iOS compatibility
      if (params.profilePhoto) {
        let profilePhotoUri = params.profilePhoto as string;
        if (typeof profilePhotoUri === 'string') {
            if (Platform.OS === 'android') {
                if (!profilePhotoUri.startsWith('file://')) {
                    profilePhotoUri = `file://${profilePhotoUri}`;
                }
            } else if (Platform.OS === 'ios') {
                profilePhotoUri = profilePhotoUri.replace('file://', '');
            }
            
            data.append('profile_photo', {
            uri: profilePhotoUri,
            name: 'profile.jpg',
            type: 'image/jpeg',
            } as any);
        }
      }

      Object.entries(files).forEach(([key, file]) => {
        if (file && file.uri) {
            let fileUri = file.uri;
            if (Platform.OS === 'android') {
                if (!fileUri.startsWith('file://')) {
                    fileUri = `file://${fileUri}`;
                }
            } else if (Platform.OS === 'ios') {
                fileUri = fileUri.replace('file://', '');
            }

            data.append(key, {
            uri: fileUri,
            name: file.name,
            type: file.type,
            } as any);
        }
      });

      const res = await API.post('/doctor/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { token, doctor } = res.data;

      // Save authentication data using centralized function
      await saveDoctorAuth(token, doctor);

      // Calculate initial profile completion
      const completion = calculateProfileCompletion(doctor);
      const percentage = Math.round(completion * 100);

      Alert.alert(
        'Success',
        `Doctor registered successfully!\nProfile Status: ${percentage}%`,
        [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]
      );
    } catch (err: any) {
      console.log('Registration error:', err.response?.data || err.message);
      console.log('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.status,
        url: err.config?.url,
        baseURL: err.config?.baseURL,
      });
      
      let message = 'Registration failed. Please try again.';
      let title = 'Registration Error';
      
      // Handle network errors
      if (!err.response) {
        // Network error - backend not reachable
        const attemptedUrl = err.config?.baseURL 
          ? `${err.config.baseURL}${err.config.url || ''}`
          : `${API_BASE_URL}${err.config?.url || '/doctor/register'}`;
        
        title = 'Connection Error';
        
        // Check if this is a production build
        const isProduction = !__DEV__;
        
        if (isProduction) {
          // Production error message - user-friendly
          message = `Cannot connect to server.\n\nPlease check:\n\n`;
          message += '• Your internet connection\n';
          message += '• Server may be temporarily unavailable\n';
          message += '• Try again in a few moments\n\n';
          message += 'If the problem persists, please contact support.';
        } else {
          // Development error message - detailed troubleshooting
          message = `Cannot connect to server.\n\nAttempted URL:\n${attemptedUrl}\n\nTroubleshooting Steps:\n\n`;
          message += '1. Backend server is running\n';
          message += '   Command: php artisan serve --host=0.0.0.0 --port=8080\n\n';
          message += '2. API URL is correct in frontend/.env file\n';
          message += '   Variable: EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP:8080\n\n';
          message += '3. Phone and computer are on same WiFi network\n\n';
          message += '4. Firewall allows port 8000\n';
          message += '   (Check Windows Firewall settings)\n\n';
          message += '5. Test connection from phone browser:\n';
          const testUrl = attemptedUrl.replace('/doctor/register', '/test');
          message += `   ${testUrl}\n\n`;
          message += '6. Restart Expo with cache clear:\n';
          message += '   npx expo start --clear';
        }
      } else if (err.response?.data?.message) {
        // Server responded with error message
        message = err.response.data.message;
      } else if (err.response?.data?.errors) {
        // Handle validation errors
        const errors = err.response.data.errors;
        message = Object.values(errors).flat().join('\n');
      } else if (err.response?.status === 500) {
        title = 'Server Error';
        message = 'Server encountered an error. Please try again later or contact support.';
      } else if (err.response?.status === 422) {
        title = 'Validation Error';
        message = 'Please check all fields and try again.';
      }
      
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['#1e40af', '#3b82f6', '#60a5fa']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => {
              try {
                router.back();
              } catch (error) {
                router.replace('/signup/basic-details');
              }
            }}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              <ThemedText style={styles.backText}>Back</ThemedText>
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <ThemedText type="title" style={styles.heading}>
                Professional Details
              </ThemedText>
              <ThemedText style={styles.subheading}>
                Step 2 of 2: Complete your profile
              </ThemedText>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <ThemedText style={styles.formTitle}>Professional Information</ThemedText>
              <ThemedText style={styles.formSubheading}>
                Add your qualifications and experience
              </ThemedText>
            </View>

            {/* Department Selection (Replaces Specialization) */}
            <View style={{ marginBottom: 20 }}>
              <ThemedText style={styles.label}>Departments (Select all that apply)</ThemedText>
              <MultiDepartmentPicker
                selectedIds={formData.department_ids}
                onValuesChange={(ids) => handleInputChange('department_ids', ids)}
                required={true}
                placeholder="Select Departments"
              />
            </View>

            {/* Dynamic Fields */}
            {Object.entries(formData)
              .filter(([key]) => !['department_ids', 'preferredWorkType'].includes(key))
              .map(([key, value]) => (
                <ThemedTextInput
                  key={key}
                  placeholder={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  value={value as string}
                  onChangeText={(v) => handleInputChange(key, v)}
                  multiline={key === 'professionalAchievements'}
                  keyboardType={key === 'experience' ? 'numeric' : 'default'}
                />
              ))}

             {/* Work Type Dropdown */}
            <View style={{ marginBottom: 20 }}>
              <ThemedText style={styles.label}>Preferred Work Type</ThemedText>
              <TouchableOpacity
                style={styles.dropdownInput}
                onPress={() => setWorkTypeModalVisible(true)}
              >
                 <ThemedText style={formData.preferredWorkType ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {formData.preferredWorkType || 'Select Work Type'}
                 </ThemedText>
                 <MaterialIcons name="arrow-drop-down" size={24} color={NeutralColors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <FileUploadButton label="Upload Degree Certificates" onFileSelected={(uri, name, type) => handleFileUpload('degree_certificate', uri, name, type)} type="document" />
            <FileUploadButton label="ID Proof" onFileSelected={(uri, name, type) => handleFileUpload('id_proof', uri, name, type)} type="both" />
            <FileUploadButton label="Medical Registration Certificate" onFileSelected={(uri, name, type) => handleFileUpload('medical_registration_certificate', uri, name, type)} type="document" />

            <ThemedButton title="Submit" onPress={handleSubmit} loading={loading} style={styles.submitButton} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Work Type Modal */}
      <Modal
        visible={workTypeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWorkTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Select Work Type</ThemedText>
                <TouchableOpacity onPress={() => setWorkTypeModalVisible(false)}>
                   <MaterialIcons name="close" size={24} color={PrimaryColors.main} />
                </TouchableOpacity>
             </View>
             {workTypeOptions.map((option) => (
                <TouchableOpacity
                   key={option}
                   style={styles.modalOption}
                   onPress={() => {
                      handleInputChange('preferredWorkType', option);
                      setWorkTypeModalVisible(false);
                   }}
                >
                   <ThemedText style={[
                       styles.modalOptionText,
                       formData.preferredWorkType === option && styles.modalOptionTextSelected
                   ]}>
                       {option}
                   </ThemedText>
                   {formData.preferredWorkType === option && (
                       <MaterialIcons name="check" size={20} color={PrimaryColors.main} />
                   )}
                </TouchableOpacity>
             ))}
          </View>
        </View>
      </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#3b82f6',
  },
  safeArea: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    padding: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 32,
    paddingHorizontal: 8,
  },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24,
    paddingVertical: 8, 
  },
  backText: { 
    fontSize: 16, 
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  heading: { 
    fontSize: 32, 
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subheading: { 
    fontSize: 16, 
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  formCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 32, 
    padding: 24, 
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowRadius: 24, 
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  formHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  formSubheading: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  inputGroup: { marginBottom: 20 },
  label: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#334155', 
    marginBottom: 10,
    marginLeft: 4,
  },
  submitButton: { 
    marginTop: 24, 
    backgroundColor: '#2563EB',
    borderRadius: 16,
    height: 56,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownPlaceholder: {
    color: '#94A3B8',
    fontSize: 16,
  },
  dropdownText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
