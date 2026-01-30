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
import { ArrowLeft, Building2, MapPin, Upload, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/api';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import { ImageCropPicker } from '@/components/ImageCropPicker';
import { validatePassword } from '@/utils/passwordValidation';
import { ErrorModal } from '@/components/ErrorModal';
import { SuccessModal } from '@/components/SuccessModal';
import { PasswordRulesInline } from '@/components/PasswordRulesInline';

export default function HospitalDetailsScreen() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    address: '',
    latitude: '',
    longitude: '',
    license_number: '',
  });
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [hospitalPictureUri, setHospitalPictureUri] = useState<string | null>(null);
  const [licenseDocument, setLicenseDocument] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  useEffect(() => {
    loadRegistrationData();
  }, []);

  const loadRegistrationData = async () => {
    try {
      const stored = await AsyncStorage.getItem('hospitalRegistrationData');
      if (stored) {
        const data = JSON.parse(stored);
        setRegistrationData(data);
        if (data.email && data.otp) {
          // Data is valid, continue
        } else {
          setErrorMessage('Registration session expired. Please start over.');
          setShowErrorModal(true);
          setTimeout(() => router.replace('/register/hospital/step1-email'), 2000);
        }
      } else {
        setErrorMessage('Registration session missing. Please start over.');
        setShowErrorModal(true);
        setTimeout(() => router.replace('/register/hospital/step1-email'), 2000);
      }
    } catch (e) {
      if (__DEV__) {
        console.error('Failed to load registration data', e);
      }
      router.replace('/register/hospital/step1-email');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));
  };

  const handleLogoSelected = (uri: string) => {
    if (uri) {
      setLogoUri(uri);
    } else {
      setLogoUri(null);
    }
  };

  const handleHospitalPictureSelected = (uri: string) => {
    if (uri) {
      setHospitalPictureUri(uri);
    } else {
      setHospitalPictureUri(null);
    }
  };

  const handlePickLicenseDocument = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('We need camera roll permissions to upload documents');
        setShowErrorModal(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.All || 'all',
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const fileSizeMB = (result.assets[0].fileSize || 0) / (1024 * 1024);
        if (fileSizeMB > 5) {
          setErrorMessage('Document must be less than 5MB. Please compress the file.');
          setShowErrorModal(true);
          return;
        }
        const filename = result.assets[0].uri.split('/').pop() || 'license.pdf';
        const match = /\.(\w+)$/.exec(filename);
        const type = match && match[1].toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg';
        setLicenseDocument({
          uri: result.assets[0].uri,
          name: filename,
          type,
        });
      }
    } catch (error: any) {
      setErrorMessage('Failed to pick document: ' + error.message);
      setShowErrorModal(true);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.password) {
      setErrorMessage('Hospital Name and Password are required');
      setShowErrorModal(true);
      return;
    }

    if (!formData.phone_number) {
      setErrorMessage('Phone Number is required');
      setShowErrorModal(true);
      return;
    }

    if (!formData.address) {
      setErrorMessage('Address is required');
      setShowErrorModal(true);
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setErrorMessage('Please select location on map');
      setShowErrorModal(true);
      return;
    }

    if (!logoUri) {
      setErrorMessage('Hospital Icon is required');
      setShowErrorModal(true);
      return;
    }

    if (!hospitalPictureUri) {
      setErrorMessage('Hospital Image is required');
      setShowErrorModal(true);
      return;
    }

    if (!licenseDocument) {
      setErrorMessage('License Document is required');
      setShowErrorModal(true);
      return;
    }

    const pwCheck = validatePassword(formData.password);
    if (!pwCheck.valid) {
      setErrorMessage(pwCheck.message);
      setShowErrorModal(true);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setShowErrorModal(true);
      return;
    }

    if (!registrationData?.email || !registrationData?.otp) {
      setErrorMessage('Registration session expired. Please start over.');
      setShowErrorModal(true);
      setTimeout(() => router.replace('/register/hospital/step1-email'), 2000);
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
      data.append('phone_number', formData.phone_number);
      data.append('address', formData.address);
      data.append('latitude', formData.latitude);
      data.append('longitude', formData.longitude);
      if (formData.license_number) data.append('license_number', formData.license_number);

      // Logo
      if (logoUri) {
        let fileUri = logoUri;
        if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
          fileUri = `file://${fileUri}`;
        } else if (Platform.OS === 'ios') {
          fileUri = fileUri.replace('file://', '');
        }
        data.append('logo_path', {
          uri: fileUri,
          name: 'logo.jpg',
          type: 'image/jpeg',
        } as any);
      }

      // Hospital Cover Image
      if (hospitalPictureUri) {
        let fileUri = hospitalPictureUri;
        if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
          fileUri = `file://${fileUri}`;
        } else if (Platform.OS === 'ios') {
          fileUri = fileUri.replace('file://', '');
        }
        data.append('hospital_picture', {
          uri: fileUri,
          name: 'hospital_picture.jpg',
          type: 'image/jpeg',
        } as any);
      }

      // License Document
      if (licenseDocument) {
        let fileUri = licenseDocument.uri;
        if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
          fileUri = `file://${fileUri}`;
        } else if (Platform.OS === 'ios') {
          fileUri = fileUri.replace('file://', '');
        }
        data.append('license_document', {
          uri: fileUri,
          name: licenseDocument.name,
          type: licenseDocument.type,
        } as any);
      }

      // Try registration with retry logic using fetch API
      let responseData: any = null;
      let lastError: any = null;
      const maxRetries = 3;
      const url = `${API_BASE_URL}/hospital/registration/register`;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            if (__DEV__) {
              console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries + 1}...`);
            }
            await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
          }
          
          if (__DEV__) {
            console.log(`📤 Attempting registration (attempt ${attempt + 1})...`);
          }
          
          // Use AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes
          
          try {
            const response = await fetch(url, {
              method: 'POST',
              body: data,
              headers: {
                'Accept': 'application/json',
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
                if (__DEV__) {
                  console.log('⚠️ Validation error - not retrying');
                }
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
            if (__DEV__) {
              console.log('✅ Registration request successful!');
            }
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
          if (__DEV__) {
            console.error(`❌ Registration attempt ${attempt + 1} failed:`, error.message || error);
          }
          
          // Don't retry on validation errors (4xx) - these are real errors
          if (error.response && error.response.status >= 400 && error.response.status < 500) {
            if (__DEV__) {
              console.log('⚠️ Validation error - not retrying');
            }
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
            !error.response;
          
          if (attempt < maxRetries && isNetworkError) {
            if (__DEV__) {
              console.warn(`⚠️ Network error on attempt ${attempt + 1}, will retry in ${3 * (attempt + 1)}s...`);
            }
            continue;
          }
          
          // No more retries or non-retryable error
          if (__DEV__) {
            console.error('❌ Max retries reached or non-retryable error');
          }
          throw error;
        }
      }
      
      if (!responseData) {
        throw lastError || new Error('Registration failed after all retries');
      }

      if (responseData.status) {
        // Clear registration data
        await AsyncStorage.removeItem('hospitalRegistrationData');
        
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
          >
            <View style={styles.card}>
              {/* Back Button */}
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.headerIconContainer}>
                <View style={styles.iconCircle}>
                  <Building2 size={24} color="#2563EB" />
                </View>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>AlverConnect</Text>
                  <Text style={styles.headerTagline}>Complete Hospital Registration</Text>
                </View>
              </View>

              {/* Required Fields Info */}
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Required Fields</Text>
                <Text style={styles.infoText}>
                  Hospital Name, Phone Number, Address, Location (Map Pin), Hospital Icon, Hospital Image, License Document
                </Text>
              </View>

              {/* Basic Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Hospital Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter hospital name"
                    placeholderTextColor="#94A3B8"
                    value={formData.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    placeholderTextColor="#94A3B8"
                    value={formData.phone_number}
                    onChangeText={(text) => handleInputChange('phone_number', text)}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Address *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter hospital address"
                    placeholderTextColor="#94A3B8"
                    value={formData.address}
                    onChangeText={(text) => handleInputChange('address', text)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Location */}
              <View style={styles.section} collapsable={false}>
                <Text style={styles.sectionTitle}>Location (Map Pin) *</Text>
                <Text style={styles.sectionHint}>Pin your hospital location on the map</Text>
                <View style={{ marginBottom: 10 }}>
                  <LocationPickerMap
                    initialLatitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
                    initialLongitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
                    onLocationSelect={handleLocationSelect}
                    height={250}
                    requireConfirm={true}
                    scrollEnabled={true}
                  />
                </View>
                {(formData.latitude || formData.longitude) && (
                  <View style={styles.locationInfo}>
                    <MapPin size={16} color={PrimaryColors.main} />
                    <Text style={styles.locationText}>
                      {formData.latitude}, {formData.longitude}
                    </Text>
                  </View>
                )}
              </View>

              {/* Documents Upload */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Documents Upload</Text>
                
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadLabel}>Hospital Icon *</Text>
                  <ImageCropPicker
                    onImageSelected={handleLogoSelected}
                    aspectRatio={[1, 1]}
                    circular={false}
                    width={400}
                    height={400}
                    showControls={true}
                    initialImage={logoUri}
                  />
                  {logoUri && (
                    <View style={styles.uploadSuccess}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={styles.uploadSuccessText}>Icon uploaded</Text>
                    </View>
                  )}
                </View>

                <View style={styles.uploadSection}>
                  <Text style={styles.uploadLabel}>Hospital Image *</Text>
                  <Text style={styles.uploadHint}>This will show at the top of your hospital profile</Text>
                  <ImageCropPicker
                    onImageSelected={handleHospitalPictureSelected}
                    aspectRatio={[16, 9]}
                    circular={false}
                    width={1200}
                    height={675}
                    showControls={true}
                    initialImage={hospitalPictureUri}
                  />
                  {hospitalPictureUri && (
                    <View style={styles.uploadSuccess}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={styles.uploadSuccessText}>Image uploaded</Text>
                    </View>
                  )}
                </View>

                <View style={styles.uploadSection}>
                  <Text style={styles.uploadLabel}>License Document *</Text>
                  <TouchableOpacity
                    style={[styles.documentButton, licenseDocument && styles.documentButtonSuccess]}
                    onPress={handlePickLicenseDocument}
                    disabled={loading}
                  >
                    <Upload size={20} color={licenseDocument ? "#10B981" : PrimaryColors.main} />
                    <Text style={[styles.documentButtonText, licenseDocument && styles.documentButtonTextSuccess]}>
                      {licenseDocument ? licenseDocument.name : 'Upload License Document (PDF/Image)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    placeholderTextColor="#94A3B8"
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    secureTextEntry
                    editable={!loading}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                  />
                  {(isPasswordFocused || !!formData.password) && (
                    <PasswordRulesInline password={formData.password} />
                  )}
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor="#94A3B8"
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
              </View>

              {/* License Number (Optional) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>License Information (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>License Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter license number"
                    placeholderTextColor="#94A3B8"
                    value={formData.license_number}
                    onChangeText={(text) => handleInputChange('license_number', text)}
                    editable={!loading}
                  />
                </View>
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
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
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
  textArea: {
    minHeight: 80,
    paddingTop: 14,
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
  uploadSection: {
    marginBottom: 24,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  uploadSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  uploadSuccessText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PrimaryColors.main,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  documentButtonSuccess: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  documentButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  documentButtonTextSuccess: {
    color: '#10B981',
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
