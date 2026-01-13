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
             // Note: Primary department concept removed - only use selected departments
             // Laravel expects department_ids as array, send each ID with indexed key
             if (Array.isArray(value) && value.length > 0) {
                 (value as number[]).forEach((id, index) => {
                     data.append(`department_ids[${index}]`, id.toString());
                 });
                 
                 // Also send as JSON string as fallback (Laravel can parse both)
                 data.append('department_ids_json', JSON.stringify(value));
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
            
            // Log file info for debugging
            if (__DEV__) {
              console.log(`📎 Appending file ${key}:`, {
                originalUri: file.uri,
                name: file.name,
                type: file.type,
                platform: Platform.OS,
              });
            }
            
            // Fix file URI for platform compatibility
            if (Platform.OS === 'android') {
                if (!fileUri.startsWith('file://')) {
                    fileUri = `file://${fileUri}`;
                }
            } else if (Platform.OS === 'ios') {
                // iOS needs file:// prefix removed for FormData
                fileUri = fileUri.replace('file://', '');
            }

            // Determine MIME type if not provided
            let mimeType = file.type;
            if (!mimeType || mimeType === '') {
              const extension = file.name.split('.').pop()?.toLowerCase();
              const mimeTypes: Record<string, string> = {
                'pdf': 'application/pdf',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              };
              mimeType = mimeTypes[extension || ''] || 'application/octet-stream';
            }

            // Verify file exists (for debugging)
            if (__DEV__) {
              console.log(`📎 Final file data for ${key}:`, {
                uri: fileUri,
                name: file.name,
                type: mimeType,
              });
            }

            data.append(key, {
              uri: fileUri,
              name: file.name || `${key}.pdf`,
              type: mimeType,
            } as any);
        }
      });

      // For multipart/form-data, don't set Content-Type header manually
      // Axios will set it automatically with the correct boundary parameter
      
      // Log request details for debugging
      if (__DEV__) {
        console.log('═══════════════════════════════════════');
        console.log('📤 DOCTOR REGISTRATION REQUEST');
        console.log('═══════════════════════════════════════');
        console.log('🔗 Endpoint:', '/doctor/register');
        console.log('🌐 Base URL:', API_BASE_URL);
        console.log('📦 FormData entries:', Object.keys(files).length, 'files');
        console.log('📝 Form fields:', {
          name: params.fullName,
          email: params.emailId,
          has_password: !!params.password,
          phone_number: params.phoneNumber,
          has_otp: !!params.otp,
          otp_length: params.otp ? (params.otp as string).length : 0,
          department_ids: formData.department_ids,
          department_ids_type: typeof formData.department_ids,
          department_ids_count: Array.isArray(formData.department_ids) ? formData.department_ids.length : 'not_array',
        });
        console.log('📎 Files:', Object.keys(files).map(key => ({
          key,
          name: files[key]?.name,
          type: files[key]?.type,
        })));
        console.log('═══════════════════════════════════════');
      }
      
      // Add retry logic for network errors
      let lastError: any = null;
      const maxRetries = 2;
      let res: any = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`🔄 Retrying registration (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          res = await API.post('/doctor/register', data, {
            timeout: 120000, // 2 minutes timeout for file uploads
            maxContentLength: Infinity, // No limit on content length
            maxBodyLength: Infinity, // No limit on body length
          });
          
          // Success - break out of retry loop
          break;
        } catch (retryError: any) {
          lastError = retryError;
          
          // Only retry on network errors, not validation errors
          if (retryError.response) {
            // Server responded with an error - don't retry
            throw retryError;
          }
          
          // Network error - retry if we have attempts left
          if (attempt < maxRetries && (
            retryError.code === 'ERR_NETWORK' ||
            retryError.code === 'ECONNREFUSED' ||
            retryError.code === 'ETIMEDOUT' ||
            retryError.message?.includes('Network') ||
            retryError.message?.includes('timeout')
          )) {
            console.warn(`⚠️ Network error on attempt ${attempt + 1}, will retry...`);
            continue;
          } else {
            // No more retries or non-retryable error
            throw retryError;
          }
        }
      }
      
      if (!res) {
        throw lastError || new Error('Failed to register after retries');
      }

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
      console.error('═══════════════════════════════════════');
      console.error('❌ DOCTOR REGISTRATION ERROR');
      console.error('═══════════════════════════════════════');
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      console.error('Response status:', err.response?.status);
      console.error('Response data:', err.response?.data);
      console.error('Request URL:', err.config?.url);
      console.error('Base URL:', err.config?.baseURL);
      console.error('Full URL:', err.config?.baseURL ? `${err.config.baseURL}${err.config.url}` : 'unknown');
      console.error('Timeout:', err.code === 'ECONNABORTED' ? 'Request timeout' : 'No timeout');
      console.error('Step failed:', err.response?.data?.step || 'unknown');
      console.error('Error code from server:', err.response?.data?.error_code || 'none');
      
      // Log server error details if available
      if (err.response?.data) {
        console.error('Server error details:', {
          status: err.response.data.status,
          message: err.response.data.message,
          step: err.response.data.step,
          error_code: err.response.data.error_code,
          errors: err.response.data.errors,
          file: err.response.data.file,
          line: err.response.data.line,
        });
      }
      
      // Log full error for debugging
      if (__DEV__) {
        console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      }
      console.error('═══════════════════════════════════════');
      
      // Enhanced error handling with better messages
      const baseUrl = err.config?.baseURL || API_BASE_URL;
      const endpoint = err.config?.url || '/doctor/register';
      const fullUrl = `${baseUrl}${endpoint}`;
      
      let message = 'Registration failed. Please try again.';
      let title = 'Registration Error';
      let showRetry = false;
      
      // Handle timeout errors
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        title = 'Upload Timeout';
        message = 'File upload is taking too long. This may be due to:\n\n';
        message += '• Large file sizes\n';
        message += '• Slow internet connection\n';
        message += '• Server processing delay\n\n';
        message += 'Please try again with smaller files or check your internet connection.';
        showRetry = true;
      }
      // Handle network errors
      else if (!err.response) {
        // Network error - backend not reachable
        const attemptedUrl = err.config?.baseURL 
          ? `${err.config.baseURL}${err.config.url || ''}`
          : `${API_BASE_URL}${err.config?.url || '/doctor/register'}`;
        
        title = 'Connection Error';
        
        // Check error code for specific issues
        const isFileUpload = err.config?.data instanceof FormData;
        const errorCode = err.code || '';
        
        if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || 
            err.message?.includes('Network') || err.message?.includes('Unable to connect')) {
          message = `Unable to connect to server.\n\n`;
          message += `Trying to reach: ${fullUrl}\n\n`;
          
          // Check if this is likely a FormData upload issue
          if (isFileUpload && fullUrl.startsWith('https://')) {
            message += `⚠️ File Upload Connection Issue\n\n`;
            message += `The server SSL certificate is valid (Grade A), but the connection failed.\n\n`;
            message += `Possible causes:\n`;
            message += `• Request timeout (120 seconds)\n`;
            message += `• File size too large\n`;
            message += `• Network connectivity issue\n`;
            message += `• React Native SSL validation (mobile-specific)\n\n`;
            message += `Try:\n`;
            message += `1. Check your internet connection\n`;
            message += `2. Reduce file sizes (compress images)\n`;
            message += `3. Try again (network may be unstable)\n`;
            message += `4. Use WiFi instead of mobile data\n\n`;
            message += `Server: medlink.alverstones.com\n`;
            message += `Error Code: ${errorCode || 'Unknown'}`;
          } else {
            message += `Please check:\n`;
            message += `1. Your internet connection\n`;
            message += `2. Backend server is running\n`;
            message += `3. Server URL is correct\n\n`;
            
            if (isFileUpload) {
              message += `File upload failed. Try:\n`;
              message += `• Smaller file sizes\n`;
              message += `• Better internet connection\n`;
            }
            
            message += `\nIf this persists, the server may be temporarily unavailable.`;
          }
          
          showRetry = true;
        } else {
          message = `Network error: ${err.message || 'Unknown error'}\n\n`;
          message += `Endpoint: ${fullUrl}\n\n`;
          message += `Please check your connection and try again.`;
          showRetry = true;
        }
        
        // Add development-specific troubleshooting if in dev mode
        if (__DEV__) {
          message += '\n\n--- Development Debug Info ---\n';
          message += `Error Code: ${errorCode}\n`;
          message += `Attempted URL: ${attemptedUrl}\n`;
          if (isFileUpload) {
            message += '\n⚠️ This is a file upload request.\n';
            message += 'Possible issues:\n';
            message += '1. File size too large (server limit)\n';
            message += '2. Request timeout (120 seconds)\n';
            message += '3. CORS not configured for file uploads\n';
            message += '4. Server not accepting multipart/form-data\n';
          }
        }
      } else if (err.response?.data) {
        // Server responded with error
        const serverData = err.response.data;
        
        // Use server-provided message if available
        if (serverData.message) {
          message = serverData.message;
        }
        
        // Add step information if available
        if (serverData.step) {
          message += `\n\nFailed at step: ${serverData.step}`;
        }
        
        // Add error code if available
        if (serverData.error_code) {
          message += `\n\nError code: ${serverData.error_code}`;
        }
        
        // Handle validation errors
        if (serverData.errors) {
          const errors = serverData.errors;
          const errorMessages = Object.values(errors).flat();
          if (errorMessages.length > 0) {
            message = errorMessages.join('\n');
          }
        }
        
        // Handle OTP errors specifically
        if (serverData.error_code === 'OTP_INVALID') {
          title = 'OTP Verification Error';
          message = serverData.message || 'Invalid or expired OTP.';
          if (serverData.otp_exists === false) {
            message += '\n\nNo OTP found for this email. Please request a new OTP.';
          } else if (serverData.otp_expired) {
            message += '\n\nThe OTP has expired. Please request a new one.';
          }
        }
        
        // Handle validation errors
        if (serverData.error_code === 'VALIDATION_ERROR' || err.response?.status === 422) {
          title = 'Validation Error';
          if (serverData.errors) {
            const errors = serverData.errors;
            message = Object.values(errors).flat().join('\n');
          } else {
            message = serverData.message || 'Please check all fields and try again.';
          }
        }
        
        // Handle server errors
        if (err.response?.status === 500) {
          title = 'Server Error';
          message = serverData.message || 'Server encountered an error. Please try again later or contact support.';
          if (serverData.file && serverData.line) {
            message += `\n\nError location: ${serverData.file}:${serverData.line}`;
          }
        }
      }
      
      Alert.alert(
        title, 
        message, 
        showRetry ? [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSubmit() }
        ] : [{ text: 'OK' }]
      );
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
