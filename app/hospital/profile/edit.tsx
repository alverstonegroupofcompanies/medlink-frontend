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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import API from '../../api';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { BASE_BACKEND_URL } from '@/config/api';
import { getUserFriendlyError } from '@/utils/errorMessages';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LocationPickerMap } from '@/components/LocationPickerMap';

const HOSPITAL_INFO_KEY = 'hospitalInfo';
const { width } = Dimensions.get('window');

export default function HospitalProfileEditScreen() {
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const response = await API.request({
        method: 'POST',
        url: '/hospital/profile',
        data: data,
        timeout: 120000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data, headers) => {
          return data;
        },
      });

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

            await API.post('/hospital/upload/picture', pictureFormData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
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
      
      // Determine appropriate title
      let errorTitle = 'Unable to Update';
      if (error.response?.status === 422) {
        errorTitle = 'Please Check Your Input';
      } else if (!error.response) {
        errorTitle = 'Connection Problem';
      } else if (error.response.status >= 500) {
        errorTitle = 'Server Error';
      }
      
      Alert.alert(errorTitle, friendlyMessage, [{ text: 'OK' }]);
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
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Save size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              {logoUri ? (
                <Image 
                  source={{ uri: logoUri }} 
                  style={styles.logo}
                  key={`hospital-logo-${logoUri || Date.now()}`} // Force re-render when logo changes
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Building2 size={48} color={PrimaryColors.main} />
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.logoButton} onPress={handlePickLogo}>
              <Camera size={18} color={PrimaryColors.main} />
              <Text style={styles.logoButtonText}>Change Logo</Text>
            </TouchableOpacity>
          </View>

          {/* Hospital Picture Section */}
          <View style={styles.logoSection}>
            <Text style={styles.sectionLabel}>Hospital Picture</Text>
            <Text style={styles.sectionHint}>This picture will appear in job opportunity cards for doctors</Text>
            <View style={styles.hospitalPictureContainer}>
              {hospitalPictureUri ? (
                <Image 
                  source={{ uri: hospitalPictureUri }} 
                  style={styles.hospitalPicture}
                  key={`hospital-picture-${hospitalPictureUri || Date.now()}`}
                />
              ) : (
                <View style={styles.hospitalPicturePlaceholder}>
                  <Camera size={48} color={PrimaryColors.main} />
                  <Text style={styles.placeholderText}>No Picture</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.logoButton} onPress={handlePickHospitalPicture}>
              <Camera size={18} color={PrimaryColors.main} />
              <Text style={styles.logoButtonText}>
                {hospitalPictureUri ? 'Change Picture' : 'Upload Hospital Picture'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
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
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.label}>Update Hospital Location</Text>
            <Text style={[styles.label, { fontSize: 12, color: NeutralColors.textSecondary, marginBottom: 12 }]}>
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
          </View>

          {/* License Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color={PrimaryColors.main} />
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

            <TouchableOpacity
              style={styles.documentButton}
              onPress={handlePickLicenseDocument}
            >
              <FileText size={18} color={PrimaryColors.main} />
              <Text style={styles.documentButtonText}>
                {licenseDocument ? licenseDocument.name : 'Upload License Document'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButtonBottom, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
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
  header: {
    backgroundColor: PrimaryColors.dark,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
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
  },
  saveButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 24,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: PrimaryColors.main,
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
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: `${PrimaryColors.main}15`,
    borderRadius: 10,
    gap: 8,
  },
  logoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: PrimaryColors.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionHint: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  hospitalPictureContainer: {
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  hospitalPicture: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: NeutralColors.backgroundSecondary,
  },
  hospitalPicturePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: NeutralColors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: NeutralColors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  section: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 16,
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
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  documentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  saveButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

