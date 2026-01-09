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
import API from '../../api';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { BASE_BACKEND_URL } from '@/config/api';
import { getUserFriendlyError } from '@/utils/errorMessages';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModernCard } from '@/components/modern-card';

import { LocationPickerMap } from '@/components/LocationPickerMap';

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
        console.error('Error loading hospital profile:', error);
      }
      const message = error?.userFriendlyMessage || error?.response?.data?.message || 'Unable to load profile. Please try again.';
      Alert.alert('Unable to Load', message);
      router.back();
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

      // Add logo if selected - handle file URI properly for React Native
      if (selectedLogo) {
        let uri = selectedLogo;
        const filename = uri.split('/').pop() || 'logo.jpg';
        const match = /\.(\w+)$/i.exec(filename);
        const extension = match ? match[1].toLowerCase() : 'jpg';
        const mimeTypes: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp',
          gif: 'image/gif',
        };
        const type = mimeTypes[extension] || 'image/jpeg';

        // Fix URI for Android/iOS
        if (Platform.OS === 'android') {
           if (!uri.startsWith('file://')) {
             uri = `file://${uri}`;
           }
        } else if (Platform.OS === 'ios') {
           uri = uri.replace('file://', '');
        }

        data.append('logo_path', {
          uri: uri,
          name: filename,
          type: type,
        } as any);
      }

      // Add license document if selected - handle file URI properly
      if (licenseDocument) {
        let uri = licenseDocument.uri;
        
        // Fix URI for Android/iOS
        if (Platform.OS === 'android') {
           if (!uri.startsWith('file://')) {
             uri = `file://${uri}`;
           }
        } else if (Platform.OS === 'ios') {
           uri = uri.replace('file://', '');
        }
        
        data.append('license_document', {
          uri: uri,
          name: licenseDocument.name,
          type: licenseDocument.type,
        } as any);
      }

      // Add method spoofing for Laravel to handle multipart/form-data with PUT
      data.append('_method', 'PUT');

      // Debug: Log FormData contents (development only)
      if (__DEV__) {
        console.log('📤 Sending hospital profile update:', {
          method: 'POST (spoofed PUT)',
          url: '/hospital/profile',
          hasLogo: !!selectedLogo,
          hasLicenseDoc: !!licenseDocument,
          formFields: {
            name: formData.name,
            email: formData.email,
            phone_number: formData.phone_number,
            address: formData.address,
            latitude: formData.latitude,
            longitude: formData.longitude,
            license_number: formData.license_number,
          },
        });
      }

      // Use POST method with _method=PUT for file uploads in Laravel
      // Note: Don't set Content-Type manually - axios will set it automatically with boundary for FormData
      // Add retry logic for network errors
      let lastError: any = null;
      const maxRetries = 2;
      let response: any = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`🔄 Retrying hospital profile update (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          response = await API.request({
            method: 'POST',
            url: '/hospital/profile',
            data: data,
            timeout: 120000,
            headers: {
              'Accept': 'application/json',
              // Content-Type will be set automatically by axios for FormData
            },
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
      
      if (!response) {
        throw lastError || new Error('Failed to update profile after retries');
      }

      // Check response structure
      if (response?.data) {
        const hospitalData = response.data.hospital || response.data;
        
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
            let uri = selectedHospitalPicture;
            const filename = uri.split('/').pop() || 'hospital_picture.jpg';
            const match = /\.(\w+)$/i.exec(filename);
            const extension = match ? match[1].toLowerCase() : 'jpg';
            const mimeTypes: Record<string, string> = {
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              png: 'image/png',
              webp: 'image/webp',
            };
            const type = mimeTypes[extension] || 'image/jpeg';

            if (Platform.OS === 'android') {
              if (!uri.startsWith('file://')) {
                uri = `file://${uri}`;
              }
            } else if (Platform.OS === 'ios') {
              uri = uri.replace('file://', '');
            }

            pictureFormData.append('hospital_picture', {
              uri: uri,
              name: filename,
              type: type,
            } as any);

            // Note: Don't set Content-Type manually - axios will set it automatically with boundary for FormData
            await API.post('/hospital/upload/picture', pictureFormData, {
              timeout: 120000,
            });

            // Update hospital picture URI
            const pictureResponse = await API.get('/hospital/profile');
            if (pictureResponse.data?.hospital?.hospital_picture_url || pictureResponse.data?.hospital?.hospital_picture) {
              const pictureUrl = pictureResponse.data.hospital.hospital_picture_url || 
                `${BASE_BACKEND_URL}/app/${pictureResponse.data.hospital.hospital_picture}`;
              setHospitalPictureUri(pictureUrl + `?t=${Date.now()}`);
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
        
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', 'No data received from server. Please try again.');
        setSaving(false);
      }
    } catch (error: any) {
      setSaving(false);
      
      if (__DEV__) {
        console.error('❌ Update error:', {
          message: error.message,
          code: error.code,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          } : null,
        });
      }
      
      // Use user-friendly error message
      const friendlyMessage = error?.userFriendlyMessage || getUserFriendlyError(error);
      
      // Determine appropriate title and retry option
      let errorTitle = 'Unable to Update';
      let showRetry = false;
      let errorMessage = friendlyMessage;
      
      if (error.response?.status === 422) {
        errorTitle = 'Please Check Your Input';
      } else if (!error.response) {
        errorTitle = 'Connection Problem';
        const baseUrl = error.config?.baseURL || 'server';
        const endpoint = error.config?.url || '/hospital/profile';
        const fullUrl = `${baseUrl}${endpoint}`;
        
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || 
            error.message?.includes('Network') || error.message?.includes('Unable to connect')) {
          errorMessage = `Unable to connect to server.\n\nTrying to reach: ${fullUrl}\n\nPlease check:\n1. Your internet connection\n2. Backend server is running\n3. Server URL is correct\n\nIf this persists, the server may be temporarily unavailable.`;
          showRetry = true;
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          errorMessage = 'Request timed out. The file may be too large or connection is slow. Please try again with a smaller file or check your connection speed.';
          showRetry = true;
        } else {
          errorMessage = `${error.message || 'Network error'}\n\nEndpoint: ${fullUrl}\n\nPlease check your connection and try again.`;
          showRetry = true;
        }
      } else if (error.response.status >= 500) {
        errorTitle = 'Server Error';
      }
      
      Alert.alert(
        errorTitle, 
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

