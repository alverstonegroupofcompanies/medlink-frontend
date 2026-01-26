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
import { ArrowLeft, Building2, Camera, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/api';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import { ImageCropPicker } from '@/components/ImageCropPicker';
import { validatePassword, PASSWORD_RULES_TEXT } from '@/utils/passwordValidation';

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
          Alert.alert('Error', 'Registration session expired. Please start over.');
          router.replace('/register/hospital/step1-email');
        }
      } else {
        Alert.alert('Error', 'Registration session missing. Please start over.');
        router.replace('/register/hospital/step1-email');
      }
    } catch (e) {
      console.error('Failed to load registration data', e);
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
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload documents');
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
          Alert.alert('File Too Large', 'Document must be less than 5MB. Please compress the file.');
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
      Alert.alert('Error', 'Failed to pick document: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.password) {
      Alert.alert('Validation Error', 'Hospital Name and Password are required');
      return;
    }

    const pwCheck = validatePassword(formData.password);
    if (!pwCheck.valid) {
      Alert.alert('Validation Error', pwCheck.message);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return;
    }

    if (!registrationData?.email || !registrationData?.otp) {
      Alert.alert('Error', 'Registration session expired. Please start over.');
      router.replace('/register/hospital/step1-email');
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
      if (formData.address) data.append('address', formData.address);
      if (formData.latitude) data.append('latitude', formData.latitude);
      if (formData.longitude) data.append('longitude', formData.longitude);
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
            console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries + 1}...`);
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
        await AsyncStorage.removeItem('hospitalRegistrationData');
        
        Alert.alert(
          'Success',
          'Registration successful! Please login to continue.',
          [
            { text: 'OK', onPress: () => router.replace('/hospital/login') }
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
          {/* Logo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hospital Logo</Text>
            <ImageCropPicker
              onImageSelected={handleLogoSelected}
              aspectRatio={[1, 1]}
              circular={false}
              width={400}
              height={400}
              showControls={true}
              initialImage={logoUri}
            />
          </View>

          {/* Hospital Image (Cover) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hospital Image (Cover)</Text>
            <Text style={styles.sectionSubtitle}>This will show at the top of your hospital profile.</Text>
            <ImageCropPicker
              onImageSelected={handleHospitalPictureSelected}
              aspectRatio={[16, 9]}
              circular={false}
              width={1200}
              height={675}
              showControls={true}
              initialImage={hospitalPictureUri}
            />
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <InputField
              label="Hospital Name *"
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter hospital name"
            />
            <InputField
              label="Password *"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              placeholder={PASSWORD_RULES_TEXT}
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
            <View style={styles.textAreaContainer}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.textArea}
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
                placeholder="Enter hospital address"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <LocationPickerMap
              initialLatitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
              initialLongitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
              onLocationSelect={handleLocationSelect}
              height={250}
            />
            {(formData.latitude || formData.longitude) && (
              <View style={styles.locationInfo}>
                <MapPin size={16} color={PrimaryColors.main} />
                <Text style={styles.locationText}>
                  {formData.latitude}, {formData.longitude}
                </Text>
              </View>
            )}
          </View>

          {/* License Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>License Information</Text>
            <InputField
              label="License Number"
              value={formData.license_number}
              onChangeText={(text) => handleInputChange('license_number', text)}
              placeholder="Enter license number"
            />
            <TouchableOpacity
              style={styles.documentButton}
              onPress={handlePickLicenseDocument}
            >
              <Text style={styles.documentButtonText}>
                {licenseDocument ? 'License Document Selected' : 'Upload License Document (PDF/Image)'}
              </Text>
            </TouchableOpacity>
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
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: -10,
    marginBottom: 12,
    lineHeight: 18,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: PrimaryColors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: PrimaryColors.main,
  },
  logoText: {
    color: PrimaryColors.main,
    fontSize: 12,
    fontWeight: '600',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: PrimaryColors.lightest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PrimaryColors.main,
  },
  logoButtonText: {
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
    minHeight: 80,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: PrimaryColors.lightest,
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: PrimaryColors.main,
    fontWeight: '500',
  },
  documentButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  documentButtonText: {
    fontSize: 14,
    color: PrimaryColors.main,
    fontWeight: '600',
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
