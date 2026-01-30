import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/api';
import { DoctorPrimaryColors as PrimaryColors } from '@/constants/doctor-theme';
import { MultiDepartmentPicker } from '@/components/multi-department-picker';
import { FileUploadButton } from '@/components/file-upload-button';
import { ImageCropPicker } from '@/components/ImageCropPicker';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import { QualificationsPicker } from '@/components/qualifications-picker';
import { validatePassword } from '@/utils/passwordValidation';
import { ErrorModal } from '@/components/ErrorModal';
import { SuccessModal } from '@/components/SuccessModal';
import { PasswordRulesInline } from '@/components/PasswordRulesInline';

export default function DoctorDetailsScreen() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    current_location_latitude: '',
    current_location_longitude: '',
    qualifications: '',
    experience: '',
    medical_council_reg_no: '',
    current_hospital: '',
    preferred_work_type: '',
    preferred_location: '',
    professional_achievements: '',
    // Banking Details (required for payments)
    bank_account_holder_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
    bank_branch: '',
    upi_id: '',
  });
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, { uri: string; name: string; type: string }>>({});
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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
          setErrorMessage('Registration session expired. Please start over.');
          setShowErrorModal(true);
          setTimeout(() => router.replace('/register/doctor/step1-email'), 1500);
        }
      } else {
        setErrorMessage('Registration session missing. Please start over.');
        setShowErrorModal(true);
        setTimeout(() => router.replace('/register/doctor/step1-email'), 1500);
      }
    } catch (e) {
      if (__DEV__) {
        console.error('Failed to load registration data', e);
      }
      router.replace('/register/doctor/step1-email');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      current_location_latitude: lat.toString(),
      current_location_longitude: lng.toString(),
    }));
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
      setErrorMessage('Name and Password are required');
      setShowErrorModal(true);
      return;
    }

    const pwCheck = validatePassword(formData.password);
    if (!pwCheck.valid) {
      setErrorMessage(pwCheck.message || 'Please enter a strong password');
      setShowErrorModal(true);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setShowErrorModal(true);
      return;
    }

    if (departmentIds.length === 0) {
      setErrorMessage('Please select at least one department');
      setShowErrorModal(true);
      return;
    }

    // Banking validation (required for payouts)
    if (!formData.bank_account_holder_name || !formData.bank_account_number || !formData.bank_ifsc_code) {
      setErrorMessage('Bank Account Holder Name, Account Number, and IFSC Code are required');
      setShowErrorModal(true);
      return;
    }
    const normalizedIfsc = formData.bank_ifsc_code.trim().toUpperCase();
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(normalizedIfsc)) {
      setErrorMessage('Please enter a valid IFSC code (e.g., HDFC0001234)');
      setShowErrorModal(true);
      return;
    }

    if (!registrationData?.email || !registrationData?.otp) {
      setErrorMessage('Registration session expired. Please start over.');
      setShowErrorModal(true);
      setTimeout(() => router.replace('/register/doctor/step1-email'), 1500);
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
      // Send location as latitude,longitude format for nearest location features
      if (formData.current_location_latitude && formData.current_location_longitude) {
        const locationString = `${formData.current_location_latitude},${formData.current_location_longitude}`;
        data.append('current_location', locationString);
      }

      // Professional Details
      if (formData.qualifications) data.append('qualifications', formData.qualifications);
      // Append "years" suffix to experience
      if (formData.experience) {
        const experienceValue = formData.experience.replace(/\D/g, ''); // Remove non-digits
        if (experienceValue) {
          data.append('experience', `${experienceValue} years`);
        }
      }
      if (formData.medical_council_reg_no) data.append('medical_council_reg_no', formData.medical_council_reg_no);
      if (formData.current_hospital) data.append('current_hospital', formData.current_hospital);
      if (formData.preferred_work_type) data.append('preferred_work_type', formData.preferred_work_type);
      if (formData.preferred_location) data.append('preferred_location', formData.preferred_location);
      if (formData.professional_achievements) data.append('professional_achievements', formData.professional_achievements);

      // Banking Details (required)
      data.append('bank_account_holder_name', formData.bank_account_holder_name);
      data.append('bank_account_number', formData.bank_account_number);
      data.append('bank_ifsc_code', normalizedIfsc);
      if (formData.bank_name) data.append('bank_name', formData.bank_name);
      if (formData.bank_branch) data.append('bank_branch', formData.bank_branch);
      if (formData.upi_id) data.append('upi_id', formData.upi_id);

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
        
        setSuccessMessage('Registration successful! Please login to continue.');
        setShowSuccessModal(true);
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      } else {
        setErrorMessage(responseData.message || 'Registration failed');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Registration error:', error);
      }
      
      let message = error.response?.data?.message || error.message || 'Registration failed';
      if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        message = errors.join('\n');
      }

      setErrorMessage(message);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <ErrorModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
      <SuccessModal
        visible={showSuccessModal}
        title="Success"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
      
      {/* Full-screen background */}
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.fullBackgroundImage}
        resizeMode="cover"
      />
      
      {/* Overlay */}
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            bounces={true}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
            directionalLockEnabled={false}
            scrollEnabled={true}
            alwaysBounceVertical={false}
          >
            <View style={styles.card}>
              {/* Back Button */}
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.headerIconContainer}>
                <View style={styles.iconCircle}>
                  <User size={24} color="#2563EB" />
                </View>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>AlverConnect</Text>
                  <Text style={styles.headerTagline}>Complete Doctor Registration</Text>
                </View>
              </View>

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
                  editable={!loading}
                />
                <InputField
                  label="Password *"
                  value={formData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  placeholder="Enter password"
                  secureTextEntry
                  editable={!loading}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                />
                {(isPasswordFocused || !!formData.password) && (
                  <PasswordRulesInline password={formData.password} />
                )}
                <InputField
                  label="Confirm Password *"
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleInputChange('confirmPassword', text)}
                  placeholder="Re-enter password"
                  secureTextEntry
                  editable={!loading}
                />
                <InputField
                  label="Phone Number"
                  value={formData.phone_number}
                  onChangeText={(text) => handleInputChange('phone_number', text)}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              {/* Current Location (Map Pin) */}
              <View style={styles.section} collapsable={false}>
                <Text style={styles.sectionTitle}>Current Location (Map Pin) *</Text>
                <Text style={styles.sectionHint}>Pin your current location for nearest location features</Text>
                <View 
                  style={{ marginBottom: 10 }}
                  onStartShouldSetResponder={() => false}
                  onMoveShouldSetResponder={() => false}
                >
                  <LocationPickerMap
                    initialLatitude={formData.current_location_latitude ? parseFloat(formData.current_location_latitude) : undefined}
                    initialLongitude={formData.current_location_longitude ? parseFloat(formData.current_location_longitude) : undefined}
                    onLocationSelect={handleLocationSelect}
                    height={250}
                    requireConfirm={true}
                    scrollEnabled={true}
                  />
                </View>
                {(formData.current_location_latitude || formData.current_location_longitude) && (
                  <View style={styles.locationInfo}>
                    <MapPin size={16} color={PrimaryColors.main} />
                    <Text style={styles.locationText}>
                      {formData.current_location_latitude}, {formData.current_location_longitude}
                    </Text>
                  </View>
                )}
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
                        disabled={loading}
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

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Qualifications</Text>
                  <QualificationsPicker
                    value={formData.qualifications}
                    onValueChange={(value) => handleInputChange('qualifications', value)}
                    placeholder="Select qualification (e.g., MBBS, MD)"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Years of Experience</Text>
                  <View style={styles.experienceContainer}>
                    <TextInput
                      style={styles.experienceInput}
                      placeholder="Enter number"
                      placeholderTextColor="#94A3B8"
                      value={formData.experience ? formData.experience.replace(/\D/g, '') : ''}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/\D/g, '');
                        handleInputChange('experience', numericValue);
                      }}
                      keyboardType="number-pad"
                      editable={!loading}
                    />
                    <View style={styles.experienceSuffix}>
                      <Text style={styles.experienceSuffixText}>years</Text>
                    </View>
                  </View>
                </View>
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

          {/* Banking Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Banking Details</Text>
            <Text style={styles.sectionHint}>
              Required for receiving payments. Please ensure details match your bank records.
            </Text>

            <InputField
              label="Account Holder Name *"
              value={formData.bank_account_holder_name}
              onChangeText={(text) => handleInputChange('bank_account_holder_name', text)}
              placeholder="Name as per bank"
            />
            <InputField
              label="Account Number *"
              value={formData.bank_account_number}
              onChangeText={(text) => handleInputChange('bank_account_number', text.replace(/\s/g, ''))}
              placeholder="Enter account number"
              keyboardType="number-pad"
            />
            <InputField
              label="IFSC Code *"
              value={formData.bank_ifsc_code}
              onChangeText={(text) => handleInputChange('bank_ifsc_code', text.toUpperCase().replace(/\s/g, ''))}
              placeholder="e.g., HDFC0001234"
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <InputField
                  label="Bank Name"
                  value={formData.bank_name}
                  onChangeText={(text) => handleInputChange('bank_name', text)}
                  placeholder="e.g., HDFC Bank"
                />
              </View>
              <View style={styles.rowItem}>
                <InputField
                  label="Branch"
                  value={formData.bank_branch}
                  onChangeText={(text) => handleInputChange('bank_branch', text)}
                  placeholder="e.g., Anna Nagar"
                />
              </View>
            </View>

            <InputField
              label="UPI ID (optional)"
              value={formData.upi_id}
              onChangeText={(text) => handleInputChange('upi_id', text)}
              placeholder="e.g., name@upi"
            />
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
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#2563EB', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Complete Registration</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  editable,
  onFocus,
  onBlur,
}: any) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        editable={editable}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e40af',
  },
  fullBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 64, 175, 0.7)',
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 200,
    paddingTop: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 32,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.15)',
  },
  headerIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  headerTagline: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
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
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: PrimaryColors.main,
    fontWeight: '500',
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  experienceInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  experienceSuffix: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
  },
  experienceSuffixText: {
    fontSize: 15,
    color: PrimaryColors.main,
    fontWeight: '600',
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
  textAreaContainer: {
    marginBottom: 16,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minHeight: 100,
  },
  submitButton: {
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 16,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
