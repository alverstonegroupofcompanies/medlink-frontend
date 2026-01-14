import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Save,
  Camera,
  FileText,
  Building2,
  Mail,
  Phone,
  MapPin,
  Shield,
  Upload,
  X,
  Eye,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { API_BASE_URL } from '@/config/api';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { BASE_BACKEND_URL } from '@/config/api';
import { getUserFriendlyError } from '@/utils/errorMessages';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModernCard } from '@/components/modern-card';

import { LocationPickerMap } from '@/components/LocationPickerMap';
import { appendFileToFormData, logFormData } from '@/utils/form-data-helper';

const HOSPITAL_INFO_KEY = 'hospitalInfo';
const { width } = Dimensions.get('window');

export default function HospitalProfileEditScreen() {
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const safeBottomPadding = useSafeBottomPadding();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    latitude: '',
    longitude: '',
    license_number: '',
  });
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [hospitalPictureUri, setHospitalPictureUri] = useState<string | null>(null);
  const [selectedHospitalPicture, setSelectedHospitalPicture] = useState<string | null>(null);
  const [licenseDocument, setLicenseDocument] = useState<{ uri: string; name: string; type: string } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await API.get('/hospital/profile');
      const hospitalData = response.data.hospital;
      setHospital(hospitalData);
      
      setFormData({
        name: hospitalData.name || '',
        email: hospitalData.email || '',
        phone_number: hospitalData.phone_number || '',
        address: hospitalData.address || '',
        latitude: hospitalData.latitude ? String(hospitalData.latitude) : '',
        longitude: hospitalData.longitude ? String(hospitalData.longitude) : '',
        license_number: hospitalData.license_number || '',
      });

      if (hospitalData.logo_url || hospitalData.logo_path) {
        const logoUrl = hospitalData.logo_url || `${BASE_BACKEND_URL}/app/${hospitalData.logo_path}`;
        // Add cache buster to force fresh image load
        const cacheBuster = `?t=${Date.now()}`;
        setLogoUri(logoUrl + cacheBuster);
      }

      if (hospitalData.hospital_picture_url || hospitalData.hospital_picture) {
        const pictureUrl = hospitalData.hospital_picture_url || `${BASE_BACKEND_URL}/app/${hospitalData.hospital_picture}`;
        const cacheBuster = `?t=${Date.now()}`;
        setHospitalPictureUri(pictureUrl + cacheBuster);
      }

      // Update stored hospital info
      await AsyncStorage.setItem(HOSPITAL_INFO_KEY, JSON.stringify(hospitalData));
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Error loading hospital profile:', error);
        console.error('Error details:', {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
        });
      }
      
      // If it's a 500 error, try to load from cache as fallback
      if (error?.response?.status === 500) {
        try {
          const cached = await AsyncStorage.getItem(HOSPITAL_INFO_KEY);
          if (cached) {
            const hospitalData = JSON.parse(cached);
            setHospital(hospitalData);
            setFormData({
              name: hospitalData.name || '',
              email: hospitalData.email || '',
              phone_number: hospitalData.phone_number || '',
              address: hospitalData.address || '',
              latitude: hospitalData.latitude ? String(hospitalData.latitude) : '',
              longitude: hospitalData.longitude ? String(hospitalData.longitude) : '',
              license_number: hospitalData.license_number || '',
            });
            
            Alert.alert(
              'Server Error',
              'Unable to load latest data from server (Error 500). Showing cached data instead.\n\nYou can still edit and save, but the server may have issues.',
              [{ text: 'OK' }]
            );
            setLoading(false);
            return;
          }
        } catch (cacheError) {
          console.error('Failed to load from cache:', cacheError);
        }
      }
      
      const message = error?.response?.status === 500
        ? 'The server encountered an error (500). This is a backend issue. Please contact the administrator or try again later.'
        : error?.userFriendlyMessage || error?.response?.data?.message || 'Unable to load profile. Please try again.';
      
      Alert.alert(
        error?.response?.status === 500 ? 'Server Error' : 'Unable to Load',
        message,
        [
          { text: 'Go Back', onPress: () => router.back(), style: 'cancel' },
          { text: 'Retry', onPress: () => loadProfile() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePickLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedLogo(result.assets[0].uri);
        setLogoUri(result.assets[0].uri);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error picking logo:', error);
      }
      Alert.alert('Unable to Select Image', 'Please try selecting the image again.');
    }
  };

  const handlePickHospitalPicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a hospital picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Landscape aspect ratio for hospital picture
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedHospitalPicture(result.assets[0].uri);
        setHospitalPictureUri(result.assets[0].uri);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error picking hospital picture:', error);
      }
      Alert.alert('Unable to Select Image', 'Please try selecting the image again.');
    }
  };

  const handlePickLicenseDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setLicenseDocument({
          uri: result.assets[0].uri,
          name: result.assets[0].name || 'license.pdf',
          type: result.assets[0].mimeType || 'application/pdf',
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error picking license document:', error);
      }
      Alert.alert('Unable to Select Document', 'Please try selecting the document again.');
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name?.trim()) {
      Alert.alert('Validation Error', 'Hospital name is required');
      return;
    }
    if (!formData.email?.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();

      // Add form fields - always send name and email (required), others only if they have values
      data.append('name', formData.name.trim());
      data.append('email', formData.email.trim());
      
      // Optional fields - only append if they have values
      if (formData.phone_number?.trim()) {
        data.append('phone_number', formData.phone_number.trim());
      }
      if (formData.address?.trim()) {
        data.append('address', formData.address.trim());
      }
      if (formData.latitude?.trim()) {
        const latValue = parseFloat(formData.latitude.trim());
        if (!isNaN(latValue)) {
          data.append('latitude', String(latValue));
        }
      }
      if (formData.longitude?.trim()) {
        const lngValue = parseFloat(formData.longitude.trim());
        if (!isNaN(lngValue)) {
          data.append('longitude', String(lngValue));
        }
      }
      if (formData.license_number?.trim()) {
        data.append('license_number', formData.license_number.trim());
      }

      // Add logo if selected
      if (selectedLogo) {
        appendFileToFormData(data, 'logo_path', { uri: selectedLogo });
      }

      // Add license document if selected
      if (licenseDocument) {
        appendFileToFormData(data, 'license_document', licenseDocument);
      }

      if (__DEV__) {
        console.log('📤 Sending hospital profile update:', {
          url: '/hospital/profile',
          hasLogo: !!selectedLogo,
          hasLicenseDoc: !!licenseDocument,
        });
      }

      // Use fetch API for FormData - more reliable than Axios in React Native
      let lastError: any = null;
      const maxRetries = 2;
      let responseData: any = null;
      const token = await AsyncStorage.getItem('hospitalToken');
      const url = `${API_BASE_URL}/hospital/profile`;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            if (__DEV__) {
              console.log(`🔄 Retrying (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Use AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds
          
          try {
            const response = await fetch(url, {
              method: 'POST',
              body: data, // FormData - don't set Content-Type, fetch handles it
              headers: {
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
                if (attempt < maxRetries) {
                  if (__DEV__) {
                    console.warn(`⚠️ Server error ${response.status} on attempt ${attempt + 1}, will retry...`);
                  }
                  continue;
                } else {
                  throw {
                    response: {
                      status: response.status,
                      data: responseData,
                    },
                    message: responseData?.message || 'Server error',
                  };
                }
              }
            }
            
            // Success
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
        } catch (retryError: any) {
          lastError = retryError;
          
          // Don't retry client errors (4xx), but allow retry for server errors (5xx) and network errors
          if (retryError.response) {
            const status = retryError.response.status;
            // Don't retry validation/authentication errors (4xx)
            if (status >= 400 && status < 500) {
              throw retryError;
            }
            // Allow retry for server errors (5xx) - these are transient
            if (status >= 500) {
              if (attempt < maxRetries) {
                if (__DEV__) {
                  console.warn(`⚠️ Server error ${status} on attempt ${attempt + 1}, will retry...`);
                }
                continue;
              } else {
                throw retryError;
              }
            }
          }
          
          // Retry network errors if we have attempts left
          if (attempt < maxRetries && (
            retryError.code === 'ERR_NETWORK' ||
            retryError.code === 'ECONNREFUSED' ||
            retryError.code === 'ETIMEDOUT' ||
            retryError.code === 'ECONNABORTED' ||
            retryError.name === 'AbortError' ||
            retryError.message?.includes('Network') ||
            retryError.message?.includes('timeout')
          )) {
            if (__DEV__) {
              console.warn(`⚠️ Network error on attempt ${attempt + 1}, will retry...`);
            }
            continue;
          }
          
          throw retryError;
        }
      }
      
      if (!responseData) {
        throw lastError || new Error('Failed to update profile');
      }

      // Check response structure
      if (responseData) {
        const hospitalData = responseData.hospital || responseData;
        
        if (!hospitalData) {
          Alert.alert('Error', 'Invalid response from server. Please try again.');
          setSaving(false);
          return;
        }
        
        // Update stored hospital info
        await AsyncStorage.setItem(HOSPITAL_INFO_KEY, JSON.stringify(hospitalData));
        
        // Update local state
        setHospital(hospitalData);
        setFormData({
          name: hospitalData.name || '',
          email: hospitalData.email || '',
          phone_number: hospitalData.phone_number || '',
          address: hospitalData.address || '',
          latitude: hospitalData.latitude ? String(hospitalData.latitude) : '',
          longitude: hospitalData.longitude ? String(hospitalData.longitude) : '',
          license_number: hospitalData.license_number || '',
        });
        
        // Update logo URI if exists with cache buster to force image refresh
        if (hospitalData.logo_url || hospitalData.logo_path) {
          const logoUrl = hospitalData.logo_url || `${BASE_BACKEND_URL}/app/${hospitalData.logo_path}`;
          // Add cache buster to force fresh image load
          const cacheBuster = `?t=${Date.now()}`;
          setLogoUri(logoUrl + cacheBuster);
        }
        
        // Upload hospital picture separately if selected
        if (selectedHospitalPicture) {
          try {
            const pictureFormData = new FormData();
            appendFileToFormData(pictureFormData, 'hospital_picture', { uri: selectedHospitalPicture });

            // Use fetch API for FormData
            const pictureUrl = `${API_BASE_URL}/hospital/upload/picture`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);
            
            try {
              const pictureResponse = await fetch(pictureUrl, {
                method: 'POST',
                body: pictureFormData,
                headers: {
                  'Accept': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
              
              if (!pictureResponse.ok) {
                throw new Error('Failed to upload hospital picture');
              }
              
              // Update hospital picture URI
              const profileResponse = await fetch(`${API_BASE_URL}/hospital/profile`, {
                headers: {
                  'Accept': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
              });
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                if (profileData?.hospital?.hospital_picture_url || profileData?.hospital?.hospital_picture) {
                  const pictureUrl = profileData.hospital.hospital_picture_url || 
                    `${BASE_BACKEND_URL}/app/${profileData.hospital.hospital_picture}`;
                  setHospitalPictureUri(pictureUrl + `?t=${Date.now()}`);
                }
              }
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              throw fetchError;
            }
          } catch (error: any) {
            if (__DEV__) {
              console.error('Error uploading hospital picture:', error);
            }
            Alert.alert('Upload Incomplete', 'Profile saved but hospital picture upload failed. Please try uploading it again.');
          }
        }

        // Clear selected logo/document/picture after successful upload
        setSelectedLogo(null);
        setSelectedHospitalPicture(null);
        setLicenseDocument(null);
        
        // Set saving to false BEFORE showing alert for immediate UI feedback
        setSaving(false);
        
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', 'No data received from server. Please try again.');
        setSaving(false);
      }
    } catch (error: any) {
      setSaving(false);
      
      let errorMessage = 'Failed to update profile';
      let showRetry = false;
      
      if (error.response) {
        // Server responded with error
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data?.errors) {
          const errors = error.response.data.errors;
          errorMessage = Object.values(errors).flat().join('\n');
        } else if (error.response.status === 422) {
          errorMessage = 'Please check your input and try again.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
          showRetry = true;
        }
      } else {
        // Network error
        const errorType = error.errorType?.type || '';
        
        if (errorType === 'SSL_ERROR' || errorType === 'NETWORK_ERROR_SSL_LIKELY') {
          errorMessage = '🔒 SSL Certificate Issue\n\n';
          errorMessage += 'Cannot connect securely to the server.\n\n';
          errorMessage += 'This is a SERVER-SIDE problem that must be fixed by your server administrator.\n\n';
          errorMessage += 'Common causes:\n';
          errorMessage += '• SSL certificate is expired or invalid\n';
          errorMessage += '• Incomplete certificate chain (missing intermediate certificates)\n';
          errorMessage += '• Certificate doesn\'t match domain name\n';
          errorMessage += '• Server not configured for large POST requests\n\n';
          errorMessage += 'What to do:\n';
          errorMessage += '1. Contact your server administrator\n';
          errorMessage += '2. Ask them to fix the SSL certificate\n';
          errorMessage += '3. Verify certificate is valid and complete\n';
          errorMessage += '4. Try again after certificate is fixed';
        } else if (errorType === 'TIMEOUT' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          errorMessage = 'Request timed out. Please try again with a smaller file or check your connection.';
          showRetry = true;
        } else if (errorType === 'CONNECTION_REFUSED' || error.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to server. Please check if the server is running.';
          showRetry = true;
        } else if (errorType === 'DNS_ERROR') {
          errorMessage = 'Cannot find server. Please check your internet connection.';
          showRetry = true;
        } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
          showRetry = true;
        } else {
          errorMessage = error.message || 'Unknown error occurred';
          showRetry = true;
        }
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        showRetry ? [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSave() }
        ] : [{ text: 'OK' }]
      );
    }
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PrimaryColors.main} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.dark}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
        
        {/* Modern Gradient Header */}
        <LinearGradient
          colors={[PrimaryColors.dark, PrimaryColors.main]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={styles.headerSaveButton}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text style={styles.headerSaveButtonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Picture Section */}
          <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Camera size={20} color={PrimaryColors.main} />
              </View>
              <Text style={styles.sectionTitle}>Profile Images</Text>
            </View>
            
            {/* Logo */}
            <View style={styles.imageUploadSection}>
              <Text style={styles.imageLabel}>Hospital Logo</Text>
              <View style={styles.imageContainer}>
                {logoUri ? (
                  <Image 
                    source={{ uri: logoUri }} 
                    style={styles.logo}
                    key={`hospital-logo-${logoUri || Date.now()}`}
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Building2 size={40} color={PrimaryColors.main} />
                  </View>
                )}
                <TouchableOpacity style={styles.imageEditButton} onPress={handlePickLogo}>
                  <Camera size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.imageButton} onPress={handlePickLogo}>
                <Camera size={18} color={PrimaryColors.main} />
                <Text style={styles.imageButtonText}>Change Logo</Text>
              </TouchableOpacity>
            </View>

            {/* Hospital Picture */}
            <View style={styles.imageUploadSection}>
              <Text style={styles.imageLabel}>Hospital Picture</Text>
              <Text style={styles.imageHint}>This picture will appear in job opportunity cards for doctors</Text>
              <View style={styles.imageContainer}>
                {hospitalPictureUri ? (
                  <Image 
                    source={{ uri: hospitalPictureUri }} 
                    style={styles.hospitalPicture}
                    key={`hospital-picture-${hospitalPictureUri || Date.now()}`}
                  />
                ) : (
                  <View style={styles.hospitalPicturePlaceholder}>
                    <Camera size={40} color={PrimaryColors.main} />
                    <Text style={styles.placeholderText}>No Picture</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.imageEditButton} onPress={handlePickHospitalPicture}>
                  <Camera size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.imageButton} onPress={handlePickHospitalPicture}>
                <Camera size={18} color={PrimaryColors.main} />
                <Text style={styles.imageButtonText}>
                  {hospitalPictureUri ? 'Change Picture' : 'Upload Hospital Picture'}
                </Text>
              </TouchableOpacity>
            </View>
          </ModernCard>

          {/* Basic Information */}
          <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Building2 size={20} color={PrimaryColors.main} />
              </View>
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hospital Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter hospital name"
                placeholderTextColor={NeutralColors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Enter email address"
                placeholderTextColor={NeutralColors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formData.phone_number}
                onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                placeholder="Enter phone number"
                placeholderTextColor={NeutralColors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Enter hospital address"
                placeholderTextColor={NeutralColors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ModernCard>

          {/* Location */}
          <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <MapPin size={20} color={PrimaryColors.main} />
              </View>
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            <Text style={styles.label}>Update Hospital Location</Text>
            <Text style={styles.locationHint}>
              Drag the map to pinpoint your exact hospital location.
            </Text>
            
            <LocationPickerMap
              initialLatitude={formData.latitude}
              initialLongitude={formData.longitude}
              onLocationSelect={(lat, lng) => {
                setFormData(prev => ({
                  ...prev,
                  latitude: lat.toString(),
                  longitude: lng.toString()
                }));
              }}
              height={300}
            />
          </ModernCard>

          {/* License Information */}
          <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Shield size={20} color={PrimaryColors.main} />
              </View>
              <Text style={styles.sectionTitle}>License Information</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>License Number</Text>
              <TextInput
                style={styles.input}
                value={formData.license_number}
                onChangeText={(text) => setFormData({ ...formData, license_number: text })}
                placeholder="Enter license number"
                placeholderTextColor={NeutralColors.textSecondary}
              />
            </View>

            {licenseDocument ? (
              <View style={styles.documentPreview}>
                <View style={styles.documentPreviewInfo}>
                  <FileText size={20} color="#10B981" />
                  <View style={styles.documentPreviewText}>
                    <Text style={styles.documentPreviewName}>{licenseDocument.name}</Text>
                    <Text style={styles.documentPreviewStatus}>Selected</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.documentRemoveButton}
                  onPress={() => setLicenseDocument(null)}
                >
                  <X size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.documentButton}
                onPress={handlePickLicenseDocument}
              >
                <Upload size={18} color={PrimaryColors.main} />
                <Text style={styles.documentButtonText}>Upload License Document</Text>
              </TouchableOpacity>
            )}
          </ModernCard>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButtonBottom, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[PrimaryColors.main, PrimaryColors.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  headerSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${PrimaryColors.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  imageUploadSection: {
    marginBottom: 20,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginBottom: 8,
  },
  imageHint: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: PrimaryColors.main,
    backgroundColor: NeutralColors.background,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${PrimaryColors.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: PrimaryColors.main,
    borderStyle: 'dashed',
  },
  imageEditButton: {
    position: 'absolute',
    bottom: 0,
    right: '40%',
    backgroundColor: PrimaryColors.main,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: `${PrimaryColors.main}10`,
    borderRadius: 10,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  hospitalPicture: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: NeutralColors.background,
    borderWidth: 2,
    borderColor: PrimaryColors.main,
  },
  hospitalPicturePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: `${PrimaryColors.main}10`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PrimaryColors.main,
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  locationHint: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: NeutralColors.background,
    borderWidth: 1,
    borderColor: NeutralColors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: NeutralColors.textPrimary,
  },
  textArea: {
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: `${PrimaryColors.main}10`,
    borderWidth: 1,
    borderColor: PrimaryColors.main,
    borderStyle: 'dashed',
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
    minHeight: 56,
  },
  documentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
    flex: 1,
    textAlign: 'center',
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    minHeight: 56,
  },
  documentPreviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  documentPreviewText: {
    flex: 1,
  },
  documentPreviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginBottom: 2,
  },
  documentPreviewStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  documentRemoveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonBottom: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

