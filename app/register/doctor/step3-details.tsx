import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Camera, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/api';
import { DoctorPrimaryColors as PrimaryColors } from '@/constants/doctor-theme';
import { MultiDepartmentPicker } from '@/components/multi-department-picker';
import { FileUploadButton } from '@/components/file-upload-button';
import { ImageCropPicker } from '@/components/ImageCropPicker';

export default function DoctorDetailsScreen() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    current_location: '',
    qualifications: '',
    experience: '',
    medical_council_reg_no: '',
    current_hospital: '',
    preferred_work_type: '',
    preferred_location: '',
    professional_achievements: '',
  });
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, { uri: string; name: string; type: string }>>({});
  const [registrationData, setRegistrationData] = useState<any>(null);

  const workTypeOptions = ['Full Time', 'Part Time', 'Session'];

  useEffect(() => {
    loadRegistrationData();
  }, []);

  const loadRegistrationData = async () => {
    try {
      const stored = await AsyncStorage.getItem('doctorRegistrationData');
      if (stored) {
        const data = JSON.parse(stored);
        setRegistrationData(data);
        if (data.email && data.otp) {
          // Data is valid, continue
        } else {
          Alert.alert('Error', 'Registration session expired. Please start over.');
          router.replace('/register/doctor/step1-email');
        }
      } else {
        Alert.alert('Error', 'Registration session missing. Please start over.');
        router.replace('/register/doctor/step1-email');
      }
    } catch (e) {
      console.error('Failed to load registration data', e);
      router.replace('/register/doctor/step1-email');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfilePhotoSelected = (uri: string) => {
    if (uri) {
      setProfilePhoto(uri);
    } else {
      setProfilePhoto(null);
    }
  };

  const handleFileUpload = (key: string, uri: string, name: string, type: string) => {
    setFiles(prev => ({ ...prev, [key]: { uri, name, type } }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.password) {
      Alert.alert('Validation Error', 'Name and Password are required');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return;
    }

    if (departmentIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one department');
      return;
    }

    if (!registrationData?.email || !registrationData?.otp) {
      Alert.alert('Error', 'Registration session expired. Please start over.');
      router.replace('/register/doctor/step1-email');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();

      // Basic Details
      data.append('email', registrationData.email);
      data.append('otp', registrationData.otp);
      data.append('name', formData.name);
      data.append('password', formData.password);
      if (formData.phone_number) data.append('phone_number', formData.phone_number);
      if (formData.current_location) data.append('current_location', formData.current_location);

      // Professional Details
      if (formData.qualifications) data.append('qualifications', formData.qualifications);
      if (formData.experience) data.append('experience', formData.experience);
      if (formData.medical_council_reg_no) data.append('medical_council_reg_no', formData.medical_council_reg_no);
      if (formData.current_hospital) data.append('current_hospital', formData.current_hospital);
      if (formData.preferred_work_type) data.append('preferred_work_type', formData.preferred_work_type);
      if (formData.preferred_location) data.append('preferred_location', formData.preferred_location);
      if (formData.professional_achievements) data.append('professional_achievements', formData.professional_achievements);

      // Departments - Send as both array format and JSON for compatibility
      departmentIds.forEach((id, index) => {
        data.append(`department_ids[${index}]`, id.toString());
      });
      // Also send as JSON string as fallback
      data.append('department_ids_json', JSON.stringify(departmentIds));
      // Also send as comma-separated string as another fallback
      data.append('department_ids_string', departmentIds.join(','));

      // Profile Photo
      if (profilePhoto) {
        let profilePhotoUri = profilePhoto;
        if (Platform.OS === 'android' && !profilePhotoUri.startsWith('file://')) {
          profilePhotoUri = `file://${profilePhotoUri}`;
        } else if (Platform.OS === 'ios') {
          profilePhotoUri = profilePhotoUri.replace('file://', '');
        }
        data.append('profile_photo', {
          uri: profilePhotoUri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        } as any);
      }

      // Documents
      Object.entries(files).forEach(([key, file]) => {
        if (file && file.uri) {
          let fileUri = file.uri;
          if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
            fileUri = `file://${fileUri}`;
          } else if (Platform.OS === 'ios') {
            fileUri = fileUri.replace('file://', '');
          }
          data.append(key, {
            uri: fileUri,
            name: file.name || `${key}.pdf`,
            type: file.type || 'application/pdf',
          } as any);
        }
      });

      // Try registration with retry logic using fetch API
      let responseData: any = null;
      let lastError: any = null;
      const maxRetries = 3;
      const url = `${API_BASE_URL}/doctor/registration/register`;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries + 1}...`);
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
          }
          
          console.log(`📤 Attempting registration (attempt ${attempt + 1})...`);
          
          // Use AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes
          
          try {
            const response = await fetch(url, {
              method: 'POST',
              body: data, // FormData - don't set Content-Type, fetch handles it
              headers: {
                'Accept': 'application/json',
                // Don't set Content-Type - let fetch handle it automatically for FormData
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            // Parse response
            responseData = await response.json();
            
            // Check if response is ok
            if (!response.ok) {
              // Don't retry on validation errors (4xx)
              if (response.status >= 400 && response.status < 500) {
                console.log('⚠️ Validation error - not retrying');
                throw {
                  response: {
                    status: response.status,
                    data: responseData,
                  },
                  message: responseData?.message || 'Validation failed',
                };
              }
              
              // Retry on server errors (5xx)
              if (response.status >= 500) {
                throw {
                  response: {
                    status: response.status,
                    data: responseData,
                  },
                  message: responseData?.message || 'Server error',
                };
              }
            }
            
            // Success - break retry loop
            console.log('✅ Registration request successful!');
            break;
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            
            // Handle AbortError (timeout)
            if (fetchError.name === 'AbortError') {
              throw {
                code: 'ETIMEDOUT',
                message: 'Request timeout',
              };
            }
            
            throw fetchError;
          }
        } catch (error: any) {
          lastError = error;
          console.error(`❌ Registration attempt ${attempt + 1} failed:`, error.message || error);
          
          // Don't retry on validation errors (4xx) - these are real errors
          if (error.response && error.response.status >= 400 && error.response.status < 500) {
            console.log('⚠️ Validation error - not retrying');
            throw error;
          }
          
          // Retry on network/SSL errors
          const isNetworkError = 
            error.code === 'ERR_NETWORK' ||
            error.code === 'NETWORK_ERROR' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ECONNREFUSED' ||
            error.name === 'AbortError' ||
            error.message?.includes('Network') ||
            error.message?.includes('Unable to connect') ||
            error.message?.includes('SSL') ||
            error.message?.includes('certificate') ||
            error.message?.includes('timeout') ||
            !error.response; // No response = network error
          
          if (attempt < maxRetries && isNetworkError) {
            console.warn(`⚠️ Network error on attempt ${attempt + 1}, will retry in ${3 * (attempt + 1)}s...`);
            continue;
          }
          
          // No more retries or non-retryable error
          console.error('❌ Max retries reached or non-retryable error');
          throw error;
        }
      }
      
      if (!responseData) {
        throw lastError || new Error('Registration failed after all retries');
      }

      if (responseData.status) {
        // Clear registration data
        await AsyncStorage.removeItem('doctorRegistrationData');
        
        Alert.alert(
          'Success',
          'Registration successful! Please login to continue.',
          [
            { text: 'OK', onPress: () => router.replace('/login') }
          ]
        );
      } else {
        Alert.alert('Error', responseData.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let message = error.response?.data?.message || error.message || 'Registration failed';
      if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        message = errors.join('\n');
      }

      Alert.alert('Registration Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Registration</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Photo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Photo</Text>
            <ImageCropPicker
              onImageSelected={handleProfilePhotoSelected}
              aspectRatio={[1, 1]}
              circular={true}
              width={400}
              height={400}
              showControls={true}
              initialImage={profilePhoto}
            />
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <InputField
              label="Full Name *"
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter your full name"
            />
            <InputField
              label="Password *"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              placeholder="Minimum 6 characters"
              secureTextEntry
            />
            <InputField
              label="Confirm Password *"
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
              placeholder="Re-enter password"
              secureTextEntry
            />
            <InputField
              label="Phone Number"
              value={formData.phone_number}
              onChangeText={(text) => handleInputChange('phone_number', text)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            <InputField
              label="Current Location"
              value={formData.current_location}
              onChangeText={(text) => handleInputChange('current_location', text)}
              placeholder="Enter current location"
            />
          </View>

          {/* Professional Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Departments *</Text>
              <MultiDepartmentPicker
                selectedIds={departmentIds}
                onValuesChange={setDepartmentIds}
                placeholder="Select at least one department"
                required
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Preferred Work Type</Text>
              <View style={styles.workTypeContainer}>
                {workTypeOptions.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.workTypeButton,
                      formData.preferred_work_type === type && styles.workTypeButtonActive,
                    ]}
                    onPress={() => handleInputChange('preferred_work_type', type)}
                  >
                    <Text
                      style={[
                        styles.workTypeText,
                        formData.preferred_work_type === type && styles.workTypeTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <InputField
              label="Qualifications"
              value={formData.qualifications}
              onChangeText={(text) => handleInputChange('qualifications', text)}
              placeholder="e.g., MBBS, MD"
            />
            <InputField
              label="Experience"
              value={formData.experience}
              onChangeText={(text) => handleInputChange('experience', text)}
              placeholder="e.g., 5 years"
            />
            <InputField
              label="Medical Council Reg No"
              value={formData.medical_council_reg_no}
              onChangeText={(text) => handleInputChange('medical_council_reg_no', text)}
              placeholder="Enter registration number"
            />
            <InputField
              label="Current Hospital"
              value={formData.current_hospital}
              onChangeText={(text) => handleInputChange('current_hospital', text)}
              placeholder="Enter current hospital name"
            />
            <InputField
              label="Preferred Location"
              value={formData.preferred_location}
              onChangeText={(text) => handleInputChange('preferred_location', text)}
              placeholder="Enter preferred work location"
            />
            <View style={styles.textAreaContainer}>
              <Text style={styles.label}>Professional Achievements</Text>
              <TextInput
                style={styles.textArea}
                value={formData.professional_achievements}
                onChangeText={(text) => handleInputChange('professional_achievements', text)}
                placeholder="Describe your professional achievements..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Documents */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents (Optional)</Text>
            <FileUploadButton
              label="Degree Certificate"
              onFileSelected={(uri, name, type) => handleFileUpload('degree_certificate', uri, name, type)}
              acceptedTypes={['pdf', 'jpg', 'png', 'jpeg']}
            />
            <FileUploadButton
              label="ID Proof"
              onFileSelected={(uri, name, type) => handleFileUpload('id_proof', uri, name, type)}
              acceptedTypes={['pdf', 'jpg', 'png', 'jpeg']}
            />
            <FileUploadButton
              label="Medical Registration Certificate"
              onFileSelected={(uri, name, type) => handleFileUpload('medical_registration_certificate', uri, name, type)}
              acceptedTypes={['pdf', 'jpg', 'png', 'jpeg']}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Complete Registration</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry }: any) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PrimaryColors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: PrimaryColors.main,
  },
  photoText: {
    color: PrimaryColors.main,
    fontSize: 12,
    fontWeight: '600',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: PrimaryColors.lightest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PrimaryColors.main,
  },
  photoButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  workTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  workTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  workTypeButtonActive: {
    borderColor: PrimaryColors.main,
    backgroundColor: PrimaryColors.lightest,
  },
  workTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  workTypeTextActive: {
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  textAreaContainer: {
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#fff',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: PrimaryColors.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
